#!/usr/bin/env bash
#
# Re-populate the Redis cache by requesting the endpoints that fill it.
#
# Cached resources expire after a day (CACHE_TTL_SECONDS in server/utils/redis.ts).
# Without this, the first visitor after an expiry pays the cold read — around two
# seconds for the results dataset. Run it from cron more often than the TTL so
# that visitor is always this script:
#
#   0 */6 * * * /path/to/vpf-page/scripts/warm-cache.sh https://your-host >> /var/log/vpf-warm.log 2>&1
#
# Usage: warm-cache.sh [base-url]
#   base-url defaults to $WARM_CACHE_BASE_URL, then http://localhost:3000
#
# Exits non-zero if any request failed, so cron reports it.

set -uo pipefail

BASE_URL="${1:-${WARM_CACHE_BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"
TIMEOUT="${WARM_CACHE_TIMEOUT:-120}"

ok=0
failed=0

# Requests a path and reports its status and wall time. A slow response is the
# point rather than a problem: it means this run rebuilt an expired entry.
warm() {
  local path="$1"
  local result http time
  result=$(curl -sS -o /dev/null --max-time "$TIMEOUT" -w '%{http_code} %{time_total}' "${BASE_URL}${path}" 2>&1)

  if [ $? -ne 0 ]; then
    # curl writes its message to stderr first and the -w metrics after, so the
    # first line is the part worth reporting.
    printf '  FAIL %s\n       %s\n' "$path" "${result%%$'\n'*}"
    failed=$((failed + 1))
    return
  fi

  http="${result%% *}"
  time="${result##* }"

  if [ "$http" = "200" ]; then
    printf '  ok   %6ss  %s\n' "$time" "$path"
    ok=$((ok + 1))
  else
    printf '  FAIL   HTTP %s  %s\n' "$http" "$path"
    failed=$((failed + 1))
  fi
}

printf '[%s] warming %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$BASE_URL"

# The two expensive datasets, plus the history page that derives from the records
# one. Year-specific requests (?year=) are cached under their own keys and warm on
# demand; only the default view is worth a scheduled request.
warm "/api/results"
warm "/api/records"
warm "/api/records/history"

# Meet pages are cached per identifier, so each published meet needs its own
# request. /api/meets returns only non-hidden meets to an anonymous caller, which
# is exactly the set that has a public page.
meets_json=$(curl -sS --max-time "$TIMEOUT" "${BASE_URL}/api/meets" 2>&1)

if [ $? -ne 0 ]; then
  printf '  FAIL /api/meets (cannot enumerate meets)\n       %s\n' "${meets_json%%$'\n'*}"
  failed=$((failed + 1))
else
  if command -v jq >/dev/null 2>&1; then
    slugs=$(printf '%s' "$meets_json" | jq -r '.data[]?.meetSlug // empty')
  else
    # Same extraction without the dependency. Whitespace around the colon is
    # optional so this survives a pretty-printed response, and the value is any
    # run of non-quote characters rather than a guess at which characters a slug
    # may contain. In both shapes the slug is the 4th quote-delimited field.
    slugs=$(printf '%s' "$meets_json" \
      | grep -oE '"meetSlug"[[:space:]]*:[[:space:]]*"[^"]*"' \
      | cut -d'"' -f4)
  fi

  if [ -z "$slugs" ]; then
    # Counts as a failure, not a warning: the response parsed to nothing, so every
    # meet page went unwarmed. Silently exiting 0 here would hide that from cron.
    printf '  FAIL /api/meets returned no meet slugs\n'
    failed=$((failed + 1))
  else
    while IFS= read -r slug; do
      [ -n "$slug" ] && warm "/api/meets/${slug}"
    done <<< "$slugs"
  fi
fi

printf '[%s] done: %d ok, %d failed\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$ok" "$failed"

[ "$failed" -eq 0 ]

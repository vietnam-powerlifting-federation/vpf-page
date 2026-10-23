#!/usr/bin/env bash

# Usage: run-tests.sh [vitest args...]
#   run-tests.sh                        run every project
#   run-tests.sh --project api          run the API tests only
#   run-tests.sh test/api/meets         run the tests under a path


set -euo pipefail

cd "$(dirname "$0")/.."

PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"
PG_READY_TIMEOUT="${PG_READY_TIMEOUT:-60}"
PG_USER=vpf
PG_PASSWORD=vpf
PG_DB=vpf_test

RUNTIME="${CONTAINER_RUNTIME:-}"
if [[ -z "$RUNTIME" ]]; then
  for candidate in docker podman; do
    if command -v "$candidate" >/dev/null 2>&1; then
      RUNTIME="$candidate"
      break
    fi
  done
fi
if [[ -z "$RUNTIME" ]]; then
  echo "run-tests: neither docker nor podman is installed" >&2
  exit 1
fi

CONTAINER="vpf-test-db-$$"

cleanup() {
  "$RUNTIME" rm --force --volumes "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Publish on a random free loopback port so this never clashes with a local
# Postgres. fsync is off because the data is thrown away anyway.
echo "run-tests: starting $PG_IMAGE with $RUNTIME"
"$RUNTIME" run --detach --rm \
  --name "$CONTAINER" \
  --env POSTGRES_USER="$PG_USER" \
  --env POSTGRES_PASSWORD="$PG_PASSWORD" \
  --env POSTGRES_DB="$PG_DB" \
  --publish 127.0.0.1::5432 \
  "$PG_IMAGE" -c fsync=off >/dev/null

PORT="$("$RUNTIME" port "$CONTAINER" 5432/tcp | head -n 1 | sed 's/.*://')"

# pg_isready answers during the image's init phase, before the real server
# starts, so a query is the reliable signal.
deadline=$((SECONDS + PG_READY_TIMEOUT))
until "$RUNTIME" exec "$CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c 'select 1' >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "run-tests: database not ready after ${PG_READY_TIMEOUT}s" >&2
    "$RUNTIME" logs "$CONTAINER" >&2 || true
    exit 1
  fi
  sleep 1
done

# dotenv does not override variables that are already set, so this wins over
# TEST_DATABASE_URL in .env.
export TEST_DATABASE_URL="postgres://$PG_USER:$PG_PASSWORD@127.0.0.1:$PORT/$PG_DB"
echo "run-tests: database ready on port $PORT"

npx vitest run "$@"

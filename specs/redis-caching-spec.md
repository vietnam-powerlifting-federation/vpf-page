# Redis Caching

Replaces Nitro's built-in cache (`defineCachedFunction`, `defineCachedEventHandler`, the `/api/results` `swr` route rule) with an explicit Redis cache, and moves the logic that used to live in API handlers into a repository and service layer.

**Status: implemented.** This describes the system as built.

## Why

Nitro's cache is per-instance and in-memory by default, invisible from outside the process, and mixed cache concerns into the route handlers. Redis gives one shared, inspectable cache across instances, with cache logic isolated in a dedicated layer.

## Layers

See [Repository and service layers](../memory/repository-and-service-layers.md).

- **`server/repository/`** — data access and the cache keys for the raw datasets, wrapping the query functions in `lib/utils/queries/`.
- **`server/service/`** — business logic and the caching of *derived* resources. Records live here because they are recomputed, not stored.
- **`server/api/`** — handlers parse and validate the request, call a service, and map the result to an `ApiResponse`. No `defineCached*`, no direct Redis access.

## Client and config

`server/utils/redis.ts` holds a singleton ioredis client plus `cacheKey`, `redisGet`, `redisSet`, `redisDel`, `redisDelByPrefix` and a `redisRemember` read-through wrapper.

- `REDIS_URL` — read directly from `process.env`. Server-only, so no `runtimeConfig` entry and deliberately not in `lib/config/config.ts`, which throws on a missing variable. A missing `REDIS_URL` must **not** be fatal.
- `CACHE_DISABLED=true` — local development escape hatch; bypasses the cache entirely.

**Every helper fails open.** The cache is an optimisation, never a dependency: an unreachable Redis logs a warning and the caller falls through to the database. The client is configured with `enableOfflineQueue: false` and `maxRetriesPerRequest: 1` so an outage fails fast rather than hanging requests on ioredis's retry-forever default.

## Cache keys

```
vpf:<resource>:<id>:<query>
```

`vpf:` is a fixed namespace so the instance can be shared without collisions and `SCAN vpf:*` stays cheap. Empty segments are dropped, which is what lets a prefix delete drop a whole resource.

| Key | Owner | Contents |
| --- | --- | --- |
| `vpf:results:all` | repository | the entire results dataset |
| `vpf:meets:<identifier>` | repository | one meet row, by id **or** slug |
| `vpf:meets:<meetId>:part=dataset` | repository | one meet's results and athletes |
| `vpf:meets:latest-national-year` | repository | most recent visible national meet year |
| `vpf:records:dataset:<range>` | repository | national results for a year range |
| `vpf:records:<year>` / `vpf:records:latest` | service | computed records standing that year |
| `vpf:records:<vpfId>` | service | one athlete's records, holding or broken |

Years and vpfIds share the `vpf:records:` segment without colliding: a vpfId always starts with letters, a year never does.

### The results dataset is cached whole, not per filter

`/api/results` accepts sort, distinct, meet type, division, weight class and sex. Caching per filter combination means a key per combination, so the whole dataset is one entry and the service narrows it in memory.

This is safe for placements specifically: `addMetadataToMeetResults` groups by meet, sex, weight class and division, and every filter either keeps a whole meet or matches on one of those exact group fields. No filter can split a placement group, so a row's placement is identical whether computed over the full dataset or a narrowed one. Verified against production data across 13 filter combinations.

Measured on production: 2026 results across 23 meets serialises to ~1 MB; the database read takes ~1.8 s, the cached read plus all in-memory filtering, sorting and ranking takes ~17 ms.

## Expiry

**Everything expires after one day** (`CACHE_TTL_SECONDS`). `redisSet` and `redisRemember` default to it, so there is no code path that can store a key forever.

This replaced an earlier design of indefinite entries cleared from each write path. Invalidating from every endpoint that touches a meet or an athlete makes every *future* endpoint a chance to forget one, and a forgotten invalidation is indistinguishable from a caching bug. A TTL bounds how wrong anything can get.

Because entries expire, Redis eviction policy is a tuning choice rather than a correctness one — an early eviction costs a slow request, not a wrong answer. Compose runs `allkeys-lru`.

## Invalidation

`invalidatePublicData()` in `server/service/cache.ts` clears all three resources together — results are computed from meets, records from results, and each embeds the athletes appearing in it.

It is called from exactly two places, both where a day of staleness has a concrete cost:

- **Results import confirm** — an unchanged records page makes an admin import a second time (§3.6).
- **The admin clear button** (`/api/admin/records-cache`) — the manual escape hatch, for when data was fixed directly in the database.

Deliberately **not** called from meet create/update/delete/clone, athlete profile edits or verification review. Those wait for the TTL.

## Keeping the cache warm

`scripts/warm-cache.sh` requests the endpoints that populate the cache, so the expiry is paid by cron rather than by a visitor. Run it more often than the TTL:

```
0 */6 * * * /path/to/vpf-page/scripts/warm-cache.sh https://your-host >> /var/log/vpf-warm.log 2>&1
```

It warms `/api/results`, `/api/records` and `/api/records/history`, then enumerates `/api/meets` and requests each meet page. Uses `jq` when available and falls back to `grep`. Exits non-zero if anything fails, including when the meet list parses to nothing.

Year-specific requests (`?year=`) have their own keys and warm on demand.

## No HTTP cache headers

`/api/records` and `/api/records/history` used to send `Cache-Control: public, max-age=86400`. That has been removed: a browser copy cannot be reached by the import-time invalidation, so it stacked on the server TTL and pushed the worst case for a returning visitor to nearly two days.

There are likewise no cache `routeRules`. A route rule is keyed on the URL alone and cannot tell one caller from another, so any rule over an `/api` prefix will eventually store one caller's response and replay it to another.

## Testing

`test/setup/redisMock.ts` replaces `server/utils/redis` with an in-memory store, reusing the real `cacheKey` and `CACHE_TTL_SECONDS`. It is not a passthrough — reads genuinely hit the store, so a handler that writes without invalidating serves stale data in tests exactly as it would in production. It also records the TTL each key was written with.

`test/api/cache-invalidation.test.ts` pins both halves of the trade-off: a meet edited behind the handler's back stays stale (proving reads are cached), an ordinary meet edit stays stale until cleared (proving the TTL model), and every key carries an expiry.

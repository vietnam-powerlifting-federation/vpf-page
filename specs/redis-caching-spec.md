# Redis Caching Spec

Replaces Nitro's built-in cache (`defineCachedFunction`, `defineCachedEventHandler`, the `/api/results` `swr` route rule) with an explicit Redis cache. Some rarely-changing or expensive to calculate resources such as meets, records, and the results list will be cached indefinitely until manually or automatically invalidated.

## Why

Nitro cache is per-instance (in-memory by default), invisible outside the process, and mixes cache concerns into API route handlers. Redis gives one shared, inspectable cache across instances, with cache logic isolated in a dedicated layer instead of scattered across handlers.

## Dependencies & config

- Add `ioredis`.
- New `server/utils/redis.ts`: singleton client from `process.env.REDIS_URL`, exported as `getRedis()`.
- Add `REDIS_URL` to `.env.example` and deployment secrets. No `runtimeConfig` entry needed — server-only, read directly from `process.env`.

## Cache key convention

```
vpf:<resource>:<id>:<query>
```

- `vpf:` — fixed namespace prefix, allows shared Redis instances without collision and cheap `SCAN vpf:*`.
- `<resource>` — plural resource name (`meets`, `records`, `results`).
- `<id>` - identifier such as user id
- `<query>` - query for filtering or sorting
See [Repository and service layers](../memory/repository-and-service-layers.md) for the `server/repository/` and `server/service/` split this spec relies on.

## Invalidation

- **Automatic on writes** (unchanged triggers, now via service layer): results import confirm, meet update/delete/clone → invalidate the affected meet, plus all records and results (results/records are computed from the full dataset, not scoped to one meet, so any results change invalidates them broadly — same as today).
]

## Migration steps

1. Add `ioredis` + `server/utils/redis.ts` (client + `cacheKey`/`redisGet`/`redisSet`/`redisDel`/`redisDelByPrefix` helpers).
2. Add `server/repository/{meets,records,results}.ts` wrapping existing query functions.
3. Add `server/service/{meets,records,results}.ts` with viewer-aware logic + invalidation orchestration, moved out of the API handlers.
4. Update `server/api/meets/[id]/index.ts`, `server/api/records/index.ts`, `server/api/records/history.ts`, `server/api/results/index.ts` to call services instead of `defineCachedFunction`/`defineCachedEventHandler`.
5. Remove the `/api/results` `swr` route rule from `nuxt.config.ts`.
6. Delete `server/utils/cached-records.ts`; update `server/api/admin/records-cache.post.ts` and the results-import confirm handler to call the new service invalidation functions.
7. Update `test/api` per CLAUDE.md: mock Redis instead of the Nitro `useStorage` mock in `test/setup/h3Mock.ts`.

## Open items to confirm before implementation

- Redis eviction policy on the instance (must be `noeviction` — any `allkeys-*` policy would silently break "indefinite until manual invalidation").
- Whether results-list caching should be scoped per-filter (as designed above) or dropped in favor of just caching the underlying `getMeetsAndResultsAndAthletes` call — per-filter means unbounded key growth over time with no TTL, which is fine only because eviction is manual/prefix-based.

# Repository and service layers

`server/repository/` and `server/service/` sit under `server/`, alongside `server/api/` and `server/utils/`. The query functions in `lib/utils/queries/` (`getMeetsAndResultsAndAthletes`, the record maths) are reached through these layers rather than called from handlers.

**`server/repository/`** — data access. Fetches raw resources and owns their cache keys, exporting a cache prefix per resource so the service layer can invalidate one without knowing how its keys are shaped.

**`server/service/`** — business logic, and the caching of *derived* resources. Records belong here because they are recomputed by walking the full attempt history rather than stored; so do per-lift placements and the filtering and ranking behind the results board.

**`server/api/`** — handlers parse and validate the request, call a service, and map the result to an `ApiResponse`. No direct repository or Redis access, and no `defineCachedEventHandler` / `defineCachedFunction`.

Everything cached expires after a day; see [the Redis caching spec](../specs/redis-caching-spec.md) for keys, expiry and the two places invalidation still fires.

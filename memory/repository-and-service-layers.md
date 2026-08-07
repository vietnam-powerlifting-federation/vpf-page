## Layers

Introduce `server/repository/` and `server/service/` under `server/`, alongside existing `server/api/` and `server/utils/`. Current query functions in `lib/utils/queries/` (`getMeetsAndResultsAndAthletes`, `fetchRecordsForYear`, etc.) or manual drizzle query in apis will be migrated to these layers.

**`server/repository/`** — define functions to get data, such as getUsersPublic or getUserPublicById, will be cache indefinitely or with TTL based on the resources

**`server/service/`** — own business logics. Records are derived resource and functions such as fetchRecordsForYear will be defined here with caching.

**`server/api/`** — handlers call the service layer, or call repository directly if the operation is small and require no validation, no direct repository or Redis access, no more `defineCachedEventHandler`/`defineCachedFunction`. 

```

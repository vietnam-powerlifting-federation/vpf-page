import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { cacheKey, redisRemember } from "~/server/utils/redis"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"

/** Cache namespace owned by this repository; services invalidate through it. */
export const RESULTS_CACHE_PREFIX = "vpf:results"

export type ResultsDataset = {
  meets: MeetPublic[]
  results: Result[]
  athletes: UserPublicWithDecorators[]
}

/**
 * Every public result, unfiltered and unsorted, under a single cache key.
 *
 * `/api/results` accepts sort/division/weight-class/sex/meet-type filters, but
 * caching per filter combination means unbounded key growth with no TTL. The
 * whole dataset is one entry instead and the results service narrows it in
 * memory — the filters are equality checks over rows already loaded, so this
 * trades a little CPU per request for a bounded keyspace.
 */
export async function getAllResultsDataset(): Promise<ResultsDataset> {
  return redisRemember(
    cacheKey("results", "all"),
    () => getMeetsAndResultsAndAthletes({}),
  )
}

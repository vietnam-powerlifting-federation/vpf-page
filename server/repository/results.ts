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
 * caching per filter combination means a key per combination. The whole dataset
 * is one entry instead and the results service narrows it in memory.
 *
 * Measured on production data: 2026 results across 23 meets serialises to about
 * 1 MB, the database read takes ~1.8 s, and the cached read plus all the
 * in-memory filtering, sorting and ranking takes ~17 ms.
 */
export async function getAllResultsDataset(): Promise<ResultsDataset> {
  return redisRemember(
    cacheKey("results", "all"),
    () => getMeetsAndResultsAndAthletes({}),
  )
}

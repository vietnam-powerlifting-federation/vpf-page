import { applyDistinctFilter, sortResultsByKey, type MeetType, type SortKey } from "~/lib/utils/queries/results"
import { getAllResultsDataset, RESULTS_CACHE_PREFIX } from "~/server/repository/results"
import { redisDelByPrefix } from "~/server/utils/redis"
import type { MeetPublic } from "~/types/meets"
import type { Result, ResultRanked } from "~/types/results"
import type { Division, Sex } from "~/types/union-types"
import type { UserPublicWithDecorators } from "~/types/users"

export type ResultsFilters = {
  sort: SortKey
  distinct: boolean
  meetType?: MeetType
  division?: Division
  weightClass?: number
  sex?: Sex
}

export type RankedResults = {
  results: ResultRanked[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
}

/**
 * The public results board.
 *
 * The filters used to run as SQL predicates on a per-request query. They are
 * applied in memory now, against one cached dataset, because a cache key per
 * filter combination would grow without bound and nothing here expires.
 *
 * This is safe for placements specifically: `addMetadataToMeetResults` groups by
 * meet, sex, weight class and division, and every filter below either keeps a
 * whole meet or matches on one of those exact group fields. No filter can ever
 * split a placement group, so a row's placement is the same whether it was
 * computed over the full dataset or the narrowed one.
 */
export async function getRankedResults(filters: ResultsFilters): Promise<RankedResults> {
  const { sort, distinct, meetType, division, weightClass, sex } = filters
  const dataset = await getAllResultsDataset()

  const meets = meetType ? dataset.meets.filter((meet) => meet.type === meetType) : dataset.meets
  const meetIds = new Set(meets.map((meet) => meet.meetId))

  const matching = dataset.results.filter((result) =>
    meetIds.has(result.meetId)
    && (division === undefined || result.division === division)
    && (weightClass === undefined || result.weightClass === weightClass)
    && (sex === undefined || result.sex === sex))

  const sorted = sortResultsByKey(matching, sort)
  const results: Result[] = distinct ? applyDistinctFilter(sorted, sort) : sorted

  // Athletes are those who actually appear in the returned results, not everyone
  // who competed in the returned meets.
  const athleteIds = new Set(results.map((result) => result.vpfId))

  return {
    results: results.map((result, index) => ({ ...result, rank: index + 1 })),
    meets,
    athletes: dataset.athletes.filter((athlete) => athleteIds.has(athlete.vpfId)),
  }
}

/** Drop every cached results dataset. Returns the number of keys removed. */
export async function invalidateResults(): Promise<number> {
  return redisDelByPrefix(RESULTS_CACHE_PREFIX)
}

import type { SortKey } from "~/lib/domain/results"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { RankingRow, ResultRanked } from "~/types/results"
import type { Division, MeetType, Sex } from "~/types/union-types"
import type { UserPublicWithDecorators } from "~/types/users"

type RankedResults = {
  results: ResultRanked[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
}

export type RankingFilters = {
  sort: SortKey
  sex?: Sex
  division?: Division
  weightClass?: number
  meetType?: MeetType
}

/**
 * The public rankings for a filter set: each athlete's best result, ranked.
 *
 * The response is reduced to `RankingRow`s in `transform`, which runs on the
 * server for the first render, so the page payload carries the columns the
 * table shows rather than every attempt of every result.
 */
export function useRankings(filters: MaybeRefOrGetter<RankingFilters>) {
  const query = computed(() => {
    const f = toValue(filters)
    return {
      distinct: "true",
      sort: f.sort,
      sex: f.sex,
      division: f.division,
      weightClass: f.weightClass,
      meetType: f.meetType,
    }
  })

  const { data, pending, error } = useFetch("/api/results", {
    key: "rankings",
    query,
    transform: (res: ApiResponse<RankedResults>): RankingRow[] => {
      if (!res.success || !res.data) return []
      const athletes = new Map(res.data.athletes.map((a) => [a.vpfId, a]))
      return res.data.results.map((r) => {
        const athlete = athletes.get(r.vpfId)
        return {
          rank: r.rank,
          vpfId: r.vpfId,
          name: athlete?.fullName ?? r.vpfId,
          slug: athlete?.slug ?? null,
          sex: r.sex,
          weightClass: r.weightClass,
          division: r.division,
          gl: r.gl,
          total: r.total,
          bestSquat: r.bestSquat,
          bestBench: r.bestBench,
          bestDeadlift: r.bestDeadlift,
        }
      })
    },
  })

  return {
    rows: computed(() => data.value ?? []),
    loaded: computed(() => data.value !== undefined && data.value !== null),
    pending,
    error,
  }
}

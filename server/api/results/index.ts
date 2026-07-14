import { applyDistinctFilter, type SortKey, type MeetType } from "~/lib/utils/queries/results"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { ResultRanked } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { UserPublicWithDecorators } from "~/types/users"
import type { Sex, Division } from "~/types/union-types"

type ResultsResponse = {
  results: ResultRanked[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<ResultsResponse>> => {
  try {
    const query = getQuery(event)

    // Parse query parameters
    const sortKey: SortKey = (query.sort as SortKey) || "gl"
    const distinct = query.distinct === "true" || query.distinct === true
    const meetType = query.meetType as MeetType | undefined
    const division = query.division as Division | undefined
    const weightClass = query.weightClass ? parseInt(query.weightClass as string, 10) : undefined
    const sex = query.sex as Sex | undefined

    // Validate sort key
    const validSortKeys: SortKey[] = ["bestSquat", "bestBench", "bestDeadlift", "total", "gl"]
    if (!validSortKeys.includes(sortKey)) {
      return fail(event, 400, {
        en: `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`,
        vi: `Khóa sắp xếp không hợp lệ. Phải là một trong: ${validSortKeys.join(", ")}`,
      })
    }

    // Fetch results using optimized query function
    const { results: initialResults, meets, athletes } = await getMeetsAndResultsAndAthletes({
      meetType: meetType ? [meetType] : undefined,
      division,
      weightClass,
      sex,
      sort: sortKey,
    })

    // Apply distinct filter if needed
    const results = distinct ? applyDistinctFilter(initialResults, sortKey) : initialResults

    const rankedResults = results.map((result, index) => ({
      ...result,
      rank: index + 1,
    })) as ResultRanked[]

    return ok(
      {
        results: rankedResults,
        meets,
        athletes,
      },
      {
        en: "Results retrieved successfully",
        vi: "Lấy kết quả thành công",
      },
    )
  } catch (error) {
    logger.error("Error fetching results", { error })
    return fail(event, 500, MSG.internalError)
  }
})

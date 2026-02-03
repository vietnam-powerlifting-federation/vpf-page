import { applyDistinctFilter, type SortKey, type MeetType } from "~/lib/utils/queries/results"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { Sex, Division } from "~/types/union-types"

type ResultsResponse = {
  results: Result[]
  meets: MeetPublic[]
  athletes: UserPublic[]
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
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`,
          vi: `Khóa sắp xếp không hợp lệ. Phải là một trong: ${validSortKeys.join(", ")}`,
        },
      }
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

    return {
      success: true,
      data: {
        results,
        meets,
        athletes,
      },
      message: {
        en: "Results retrieved successfully",
        vi: "Lấy kết quả thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching results", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

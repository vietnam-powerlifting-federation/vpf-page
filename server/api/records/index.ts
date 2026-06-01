import { logger } from "~/lib/logger/logger"
import { cachedFetchRecordsForYear } from "~/server/utils/cached-records"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublicWithDecorators } from "~/types/users"
import type { Result } from "~/types/results"

type RecordsResponse = {
  records: LiftRecord[]
  meet: MeetPublic[]
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<RecordsResponse>> => {
  try {
    // Get year query parameter
    const query = getQuery(event)
    const year = query.year ? parseInt(query.year as string, 10) : null

    // Fetch records using the utility function
    const { records, meets: allMeets, athletes, results } = await cachedFetchRecordsForYear({
      maxYear: year,
    })

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")
    setResponseStatus(event, 200)

    return {
      success: true,
      data: {
        records,
        meet: allMeets,
        athletes,
        results,
      },
      message: {
        en: "Records retrieved successfully",
        vi: "Lấy thông tin kỷ lục thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching records", { error })
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

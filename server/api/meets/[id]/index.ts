import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"

type MeetDetailsResponse = {
  meet: MeetPublic
  results: Result[]
  athletes: UserPublic[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<MeetDetailsResponse>> => {
  try {
    const meetId = getRouterParam(event, "id")
    
    if (!meetId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Meet ID is required",
          vi: "ID meet là bắt buộc",
        },
      }
    }

    const meetIdNum = parseInt(meetId, 10)
    if (isNaN(meetIdNum)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid meet ID",
          vi: "ID meet không hợp lệ",
        },
      }
    }

    // Query meet, results, and athletes in a single optimized query
    const { meets, results: transformedResults, athletes: publicAthletes } = await getMeetsAndResultsAndAthletes({
      meetIds: [meetIdNum],
    })

    const meet = meets[0] || null

    if (!meet) {
      setResponseStatus(event, 404)
      return {
        success: false,
        data: null,
        message: {
          en: "Meet not found",
          vi: "Không tìm thấy meet",
        },
      }
    }

    return {
      success: true,
      data: {
        meet,
        results: transformedResults,
        athletes: publicAthletes,
      },
      message: {
        en: "Meet details retrieved successfully",
        vi: "Lấy thông tin meet thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching meet details", { error })
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

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import { getUsersJoinMeets } from "~/lib/utils/queries/users"
import { getResultsForMeets } from "~/lib/utils/queries/results"

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

    // Query the meet
    const [meet] = await db
      .select()
      .from(meets)
      .where(eq(meets.meetId, meetIdNum))

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

    // Query results for the meet
    const transformedResults = await getResultsForMeets([meet])

    // Query all users who participated 
    const publicAthletes = await getUsersJoinMeets([meet])

    return {
      success: true,
      data: {
        meet: meet,
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

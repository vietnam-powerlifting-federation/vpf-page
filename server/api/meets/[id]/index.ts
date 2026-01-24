import { eq, getTableColumns } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets, meetResults, legacyMeetResults, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import { toUserPublic } from "~/lib/utils/user"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPrivate, UserPublic } from "~/types/users"

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

    // Query results based on legacy attribute
    const allRawResults = meet.legacy
      ? await db
        .select()
        .from(legacyMeetResults)
        .where(eq(legacyMeetResults.meetId, meetIdNum))
      : await db
        .select()
        .from(meetResults)
        .where(eq(meetResults.meetId, meetIdNum))

    // Transform results
    const transformedResults = addMetadataToMeetResults(allRawResults)

    // Query all users who participated using JOINs based on legacy attribute
    const allAthletes = meet.legacy
      ? await db
        .select(getTableColumns(users))
        .from(legacyMeetResults)
        .innerJoin(users, eq(legacyMeetResults.vpfId, users.vpfId))
        .where(eq(legacyMeetResults.meetId, meetIdNum))
      : await db
        .select(getTableColumns(users))
        .from(meetResults)
        .innerJoin(users, eq(meetResults.vpfId, users.vpfId))
        .where(eq(meetResults.meetId, meetIdNum))

    // Get unique users (in case of duplicates)
    const allAthletesMap = new Map<string, UserPrivate>()
    for (const user of allAthletes) {
      allAthletesMap.set(user.vpfId, user)
    }

    // Transform to public users
    const publicAthletes = Array.from(allAthletesMap.values()).map(toUserPublic)

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

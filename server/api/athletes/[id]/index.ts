import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/utils/queries/users"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { getPersonalBestSummary } from "~/lib/utils/queries/results"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { MeetPublic } from "~/types/meets"

type AthleteDetailsResponse = {
  athlete: UserPrivate | UserPublic
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<AthleteDetailsResponse>> => {
  try {
    const idParam = getRouterParam(event, "id")
    const currentUser = event.context.user

    if (!idParam) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Athlete ID is required",
          vi: "ID vận động viên là bắt buộc",
        },
      }
    }

    const vpfId = idParam === "self" ? currentUser?.vpfId : idParam

    if (!vpfId) {
      setResponseStatus(event, 401)
      return {
        success: false,
        data: null,
        message: {
          en: "Unauthorized",
          vi: "Không được phép",
        },
      }
    }

    const isAdmin = currentUser?.role === "admin"
    const isOwnProfile = currentUser?.vpfId === vpfId
    const isPrivate = isAdmin || isOwnProfile

    let athlete
    if (isPrivate) {
      const result = await db
        .select(userPrivateSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    } else {
      const result = await db
        .select(userPublicSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    }

    if (!athlete) {
      setResponseStatus(event, 404)
      return {
        success: false,
        data: null,
        message: {
          en: "Athlete not found",
          vi: "Không tìm thấy vận động viên",
        },
      }
    }

    const query = getQuery(event)
    const excludeHidden = query.excludeHidden === "true" || query.excludeHidden === true
    const { meets: returnedMeets, results } = await getMeetsAndResultsAndAthletes({
      vpfIds: [vpfId],
      hidden: excludeHidden ? false : undefined,
    })

    results.sort((a, b) => b.meetId - a.meetId)
    const compHistory = results
    const personalBest = getPersonalBestSummary(results)

    return {
      success: true,
      data: {
        athlete,
        personalBest,
        compHistory,
        meets: returnedMeets,
      },
      message: {
        en: "Athlete details retrieved successfully",
        vi: "Lấy thông tin vận động viên thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching athlete details", { error })
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

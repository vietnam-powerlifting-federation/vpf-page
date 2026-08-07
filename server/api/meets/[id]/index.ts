import { logger } from "~/lib/logger/logger"
import { getMeetDetails, type MeetDetails } from "~/server/service/meets"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import type { ApiResponse } from "~/types/api"

/**
 * Public meet page. Caching lives in the service behind this, keyed on the meet
 * identifier alone, which is only safe because this endpoint reads public data
 * and nothing in the response varies by caller — unlike the admin-only reads
 * beneath /api/meets/[id] (the entry roster, the ban list).
 */
export default defineEventHandler(async (event): Promise<ApiResponse<MeetDetails>> => {
  try {
    const identifier = getRouterParam(event, "id")

    if (!identifier) {
      return fail(event, 400, {
        en: "Meet identifier is required",
        vi: "Định danh meet là bắt buộc",
      })
    }

    const details = await getMeetDetails(identifier)
    if (!details) return fail(event, 404, MEET_NOT_FOUND)

    return ok(details, {
      en: "Meet details retrieved successfully",
      vi: "Lấy thông tin meet thành công",
    })
  } catch (error) {
    logger.error("Error fetching meet details", { error })
    return fail(event, 500, MSG.internalError)
  }
})

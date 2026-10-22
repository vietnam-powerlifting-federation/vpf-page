import { getMeetDetails, type MeetDetails } from "~/server/service/meets"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MEET_NOT_FOUND } from "~/server/service/meet-admin"
import type { ApiResponse } from "~/types/api"

/**
 * Public meet page. Caching lives in the service behind this, keyed on the meet
 * identifier alone, which is only safe because this endpoint reads public data
 * and nothing in the response varies by caller — unlike the admin-only reads
 * beneath /api/meets/[id] (the entry roster, the ban list).
 *
 * Hidden meets are gated the same way the meet list gates them: visible to an
 * admin, a 404 to everyone else.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<MeetDetails>> => {
  const identifier = getRouterParam(event, "id")

  if (!identifier) {
    return fail(event, 400, {
      en: "Meet identifier is required",
      vi: "Định danh meet là bắt buộc",
    })
  }

  const isAdmin = event.context.user?.role === "admin"
  const details = await getMeetDetails(identifier, { includeHidden: isAdmin })
  if (!details) return fail(event, 404, MEET_NOT_FOUND)

  return ok(details, {
    en: "Meet details retrieved successfully",
    vi: "Lấy thông tin meet thành công",
  })
})

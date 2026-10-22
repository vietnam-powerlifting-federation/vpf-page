import { listMeets } from "~/server/repository/meets"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export default defineApiHandler(async (event): Promise<ApiResponse<MeetPublic[]>> => {
  // Hidden meets are the admin console's unpublished drafts, so the meet list
  // has to be able to show them — but only to an admin who asks (§2). Mirrors
  // the admin branch in /api/athletes.
  const isAdmin = event.context.user?.role === "admin"
  const includeHidden = isAdmin && String(getQuery(event).includeHidden) === "true"

  const allMeets = await listMeets(includeHidden)

  return ok(allMeets, {
    en: "Meets retrieved successfully",
    vi: "Lấy danh sách meet thành công",
  })
})

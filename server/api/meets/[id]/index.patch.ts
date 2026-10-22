import { meetHasResults } from "~/server/repository/entries"
import { updateMeet } from "~/server/repository/meets"
import { logger } from "~/lib/logger/logger"
import { MeetPatchSchema } from "~/lib/zod/schemas/meets.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { isSlugTaken, MEET_ADMIN_FORBIDDEN, MEET_NOT_FOUND, SLUG_TAKEN } from "~/server/service/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export default defineApiHandler(async (event): Promise<ApiResponse<MeetPublic>> => {
  const auth = requireAdmin(event, MEET_ADMIN_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const validated = await readZodBody(event, MeetPatchSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const data = validated.data

  if (data.meetSlug && data.meetSlug !== meet.meetSlug && await isSlugTaken(data.meetSlug, meet.meetId)) {
    return fail(event, 409, SLUG_TAKEN)
  }

  // `legacy` selects which table backs the meet's results. Flipping it once
  // results exist would orphan every one of them, so lock it at that point.
  if (data.legacy !== undefined && (data.legacy ?? false) !== (meet.legacy ?? false)) {
    const hasResults = await meetHasResults(meet.meetId)
    if (hasResults) {
      return fail(event, 409, {
        en: "This meet already has results, so it cannot be switched between legacy and modern",
        vi: "Giải đấu này đã có kết quả nên không thể chuyển đổi giữa legacy và hiện hành",
      })
    }
  }

  const updated = await updateMeet(meet.meetId, data)

  logger.info("Meet updated", {
    meetId: meet.meetId,
    updatedBy: auth.user.vpfId,
    fields: Object.keys(data),
  })

  return ok(updated, { en: "Meet updated", vi: "Đã cập nhật giải đấu" })
})

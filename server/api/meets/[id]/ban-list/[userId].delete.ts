import { deleteBanListEntry } from "~/server/repository/meets"
import { logger } from "~/lib/logger/logger"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { isUserId } from "~/server/service/athletes"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import type { ApiResponse } from "~/types/api"

export default defineApiHandler(async (event): Promise<ApiResponse<{ meetId: number; userId: string }>> => {
  const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  const userId = getRouterParam(event, "userId")
  if (!identifier || !userId || !isUserId(userId)) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const removed = await deleteBanListEntry(meet.meetId, userId)

  if (!removed) {
    return fail(event, 404, {
      en: "That athlete is not on this meet's ban list",
      vi: "Vận động viên này không nằm trong danh sách hạn chế của giải",
    })
  }

  logger.info("Competition ban removed", { meetId: meet.meetId, userId, removedBy: auth.user.vpfId })

  return ok(
    { meetId: meet.meetId, userId },
    { en: "Athlete removed from the ban list", vi: "Đã gỡ vận động viên khỏi danh sách hạn chế" },
  )
})

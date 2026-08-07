import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionBanList } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import type { ApiResponse } from "~/types/api"

export default defineEventHandler(async (event): Promise<ApiResponse<{ meetId: number; vpfId: string }>> => {
  try {
    const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    const vpfId = getRouterParam(event, "vpfId")
    if (!identifier || !vpfId) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const removed = await db
      .delete(competitionBanList)
      .where(and(eq(competitionBanList.meetId, meet.meetId), eq(competitionBanList.vpfId, vpfId)))
      .returning({ id: competitionBanList.id })
      .then((rows) => rows[0])

    if (!removed) {
      return fail(event, 404, {
        en: "That athlete is not on this meet's ban list",
        vi: "Vận động viên này không nằm trong danh sách hạn chế của giải",
      })
    }

    logger.info("Competition ban removed", { meetId: meet.meetId, vpfId, removedBy: auth.user.vpfId })

    return ok(
      { meetId: meet.meetId, vpfId },
      { en: "Athlete removed from the ban list", vi: "Đã gỡ vận động viên khỏi danh sách hạn chế" },
    )
  } catch (error) {
    logger.error("Error removing competition ban", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

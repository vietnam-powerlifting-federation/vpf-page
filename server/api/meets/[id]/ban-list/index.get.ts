import { and, desc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionBanList, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import type { ApiResponse } from "~/types/api"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * The per-meet exclusion list (§5.3). Meet-scoped rather than a global screen,
 * and deliberately not framed as punishment: real entries look like "already won
 * gold in the 74 class at meet X, cannot re-enter" as often as they are
 * disciplinary.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<CompetitionBanWithUser[]>> => {
  try {
    const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const rows = await db
      .select({
        id: competitionBanList.id,
        meetId: competitionBanList.meetId,
        vpfId: competitionBanList.vpfId,
        reason: competitionBanList.reason,
        createdAt: competitionBanList.createdAt,
        userName: users.fullName,
      })
      .from(competitionBanList)
      .innerJoin(users, eq(users.vpfId, competitionBanList.vpfId))
      .where(and(eq(competitionBanList.meetId, meet.meetId)))
      .orderBy(desc(competitionBanList.createdAt))

    const data: CompetitionBanWithUser[] = rows.map((row) => ({ ...row, meetName: meet.meetName }))

    return ok(data, { en: "Ban list retrieved", vi: "Lấy danh sách hạn chế thành công" })
  } catch (error) {
    logger.error("Error listing competition bans", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

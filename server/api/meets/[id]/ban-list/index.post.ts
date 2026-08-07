import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionBanList, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { CompetitionBanSchema } from "~/lib/zod/schemas/violations.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * Add or update a meet exclusion. `unique(meetId, vpfId)` means re-banning the
 * same athlete is an edit rather than a second row, so this upserts.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<CompetitionBanWithUser>> => {
  try {
    const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, CompetitionBanSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { vpfId, reason } = validated.data

    const athlete = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.vpfId, vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!athlete) return fail(event, 404, MSG.athleteNotFound)

    const saved = await db
      .insert(competitionBanList)
      .values({ meetId: meet.meetId, vpfId, reason })
      .onConflictDoUpdate({
        target: [competitionBanList.meetId, competitionBanList.vpfId],
        set: { reason },
      })
      .returning()
      .then((rows) => rows[0])

    logger.info("Competition ban saved", {
      meetId: meet.meetId,
      vpfId,
      savedBy: auth.user.vpfId,
    })

    return ok(
      { ...saved, userName: athlete.fullName, meetName: meet.meetName },
      { en: "Athlete added to the ban list", vi: "Đã thêm vận động viên vào danh sách hạn chế" },
    )
  } catch (error) {
    logger.error("Error saving competition ban", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

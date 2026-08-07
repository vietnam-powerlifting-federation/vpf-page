import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionPurchaseMetadata, meetResults, meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { MeetDeleteSchema } from "~/lib/zod/schemas/meets.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { invalidatePublicData } from "~/server/service/cache"
import { resolveMeet } from "~/server/utils/competition-registration"
import { MEET_ADMIN_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"

/**
 * Hard-delete a meet (§2).
 *
 * `meets` cascades to results, the ban list and competition purchase metadata, so
 * a careless delete silently destroys paid registrations. Hiding is the default
 * action in the UI; this endpoint exists for the genuine mistake — a meet created
 * in error — and refuses whenever anything downstream would go with it.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<{ meetId: number }>> => {
  try {
    const auth = requireAdmin(event, MEET_ADMIN_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, MeetDeleteSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)

    if (validated.data.confirmName !== meet.meetName) {
      return fail(event, 400, {
        en: "The typed name does not match this meet",
        vi: "Tên đã nhập không khớp với giải đấu này",
      })
    }

    const hasResults = await db
      .select({ resultId: meetResults.resultId })
      .from(meetResults)
      .where(eq(meetResults.meetId, meet.meetId))
      .limit(1)
      .then((rows) => rows[0])

    const hasPurchases = await db
      .select({ purchaseId: competitionPurchaseMetadata.purchaseId })
      .from(competitionPurchaseMetadata)
      .where(eq(competitionPurchaseMetadata.meetId, meet.meetId))
      .limit(1)
      .then((rows) => rows[0])

    if (hasResults || hasPurchases) {
      return fail(event, 409, {
        en: "This meet has results or registrations attached; hide it instead of deleting it",
        vi: "Giải đấu này đã có kết quả hoặc đăng ký; hãy ẩn thay vì xoá",
      })
    }

    await db.delete(meets).where(eq(meets.meetId, meet.meetId))

    await invalidatePublicData("meet-delete")

    logger.warn("Meet deleted", {
      meetId: meet.meetId,
      meetName: meet.meetName,
      deletedBy: auth.user.vpfId,
      reason: validated.data.reason,
    })

    return ok({ meetId: meet.meetId }, { en: "Meet deleted", vi: "Đã xoá giải đấu" })
  } catch (error) {
    logger.error("Error deleting meet", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

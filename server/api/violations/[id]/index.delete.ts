import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { VIOLATIONS_FORBIDDEN } from "~/server/utils/violation-helpers"
import type { ApiResponse } from "~/types/api"

/**
 * Lift a violation. A hard delete rather than a soft one because the level rule is
 * a row count: a "cancelled" row that still existed would keep blocking the
 * athlete unless every query learned to exclude it.
 *
 * The reason is required and logged with the actor — this is a contestable record,
 * and an athlete will eventually ask who lifted it and when.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<{ id: number }>> => {
  try {
    const auth = requireAdmin(event, VIOLATIONS_FORBIDDEN)
    if (!auth.ok) return auth.error

    const id = Number(getRouterParam(event, "id"))
    if (Number.isNaN(id)) return fail(event, 400, MSG.invalidInput)

    const reason = String(getQuery(event).reason ?? "").trim()
    if (!reason) {
      return fail(event, 400, {
        en: "A reason is required to lift a violation",
        vi: "Cần nêu lý do khi gỡ vi phạm",
      })
    }

    const deleted = await db
      .delete(userViolations)
      .where(eq(userViolations.id, id))
      .returning({ id: userViolations.id, vpfId: userViolations.vpfId })
      .then((rows) => rows[0])

    if (!deleted) return fail(event, 404, { en: "Violation not found", vi: "Không tìm thấy vi phạm" })

    logger.warn("Violation lifted", {
      violationId: id,
      vpfId: deleted.vpfId,
      reason,
      liftedBy: auth.user.vpfId,
    })

    return ok({ id: deleted.id }, { en: "Violation lifted", vi: "Đã gỡ vi phạm" })
  } catch (error) {
    logger.error("Error deleting violation", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

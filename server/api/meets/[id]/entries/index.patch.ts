import { and, eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetEntries } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { EntryBulkAssignSchema } from "~/lib/zod/schemas/entries.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"

/**
 * Set platform / session / flight across a selection (§6.5). Session planning is
 * done in blocks — by division and weight class — so doing it one row at a time
 * is the wrong shape for the job.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<{ updated: number }>> => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, EntryBulkAssignSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { entryIds, ...assignment } = validated.data

    const patch = Object.fromEntries(
      Object.entries(assignment).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(patch).length === 0) return fail(event, 400, MSG.invalidInput)

    // Scoped to this meet, so an entry id from another meet cannot be reassigned.
    const updated = await db
      .update(meetEntries)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(meetEntries.meetId, meet.meetId), inArray(meetEntries.entryId, entryIds)))
      .returning({ entryId: meetEntries.entryId })

    logger.info("Meet entries bulk assigned", {
      meetId: meet.meetId,
      count: updated.length,
      fields: Object.keys(patch),
      assignedBy: auth.user.vpfId,
    })

    return ok({ updated: updated.length }, {
      en: `${updated.length} entries updated`,
      vi: `Đã cập nhật ${updated.length} lượt đăng ký`,
    })
  } catch (error) {
    logger.error("Error bulk assigning meet entries", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

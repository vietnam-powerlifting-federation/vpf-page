import { updateEntries } from "~/server/repository/entries"
import { logger } from "~/lib/logger/logger"
import { EntryBulkAssignSchema } from "~/lib/zod/schemas/entries.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"

/**
 * Set platform / session / flight across a selection (§6.5). Session planning is
 * done in blocks — by division and weight class — so doing it one row at a time
 * is the wrong shape for the job.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<{ updated: number }>> => {
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
  const updated = await updateEntries(meet.meetId, entryIds, patch)

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
})

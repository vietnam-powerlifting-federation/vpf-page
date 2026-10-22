import { insertEntries, listEnteredVpfIds, listPaidRegistrations } from "~/server/repository/entries"
import { logger } from "~/lib/logger/logger"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import type { ApiResponse } from "~/types/api"
import type { EntryGenerationResult } from "~/types/entries"

/**
 * Turn paid registrations into a start list (§6.5).
 *
 * One row per athlete with an `active` competition purchase for this meet, seeded
 * from `competition_purchase_metadata`. **Idempotent by design**: re-running picks
 * up newly-paid athletes without disturbing the assignments already made, because
 * the meet director will run it more than once as payments land.
 *
 * `sex` / `weightClass` / `division` are copied rather than referenced: the
 * purchase metadata is a payment record, and a lifter cutting weight must not
 * rewrite what they were charged for (§6.1).
 */
export default defineApiHandler(async (event): Promise<ApiResponse<EntryGenerationResult>> => {
  const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const paid = await listPaidRegistrations(meet.meetId)

  const alreadyEntered = new Set(await listEnteredVpfIds(meet.meetId))

  const toCreate = paid.filter((row) => !alreadyEntered.has(row.vpfId))

  await insertEntries(toCreate.map((row) => ({
    meetId: meet.meetId,
    vpfId: row.vpfId,
    purchaseId: row.purchaseId,
    sex: row.sex,
    weightClass: row.weightClass,
    division: row.division,
  })))

  logger.info("Meet entries generated", {
    meetId: meet.meetId,
    created: toCreate.length,
    generatedBy: auth.user.vpfId,
  })

  return ok(
    { meetId: meet.meetId, created: toCreate.length, skipped: paid.length - toCreate.length },
    {
      en: `${toCreate.length} entries created, ${paid.length - toCreate.length} already existed`,
      vi: `Đã tạo ${toCreate.length} lượt đăng ký, ${paid.length - toCreate.length} đã có sẵn`,
    },
  )
})

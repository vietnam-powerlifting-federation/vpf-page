import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionPurchaseMetadata, meetEntries, purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
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
export default defineEventHandler(async (event): Promise<ApiResponse<EntryGenerationResult>> => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const paid = await db
      .select({
        vpfId: purchases.vpfId,
        purchaseId: purchases.purchaseId,
        sex: competitionPurchaseMetadata.sex,
        weightClass: competitionPurchaseMetadata.weightClass,
        division: competitionPurchaseMetadata.division,
      })
      .from(competitionPurchaseMetadata)
      .innerJoin(purchases, eq(purchases.purchaseId, competitionPurchaseMetadata.purchaseId))
      .where(and(
        eq(competitionPurchaseMetadata.meetId, meet.meetId),
        eq(purchases.status, "active"),
      ))

    const existing = await db
      .select({ vpfId: meetEntries.vpfId })
      .from(meetEntries)
      .where(eq(meetEntries.meetId, meet.meetId))
    const alreadyEntered = new Set(existing.map((row) => row.vpfId))

    const toCreate = paid.filter((row) => !alreadyEntered.has(row.vpfId))

    if (toCreate.length > 0) {
      await db
        .insert(meetEntries)
        .values(toCreate.map((row) => ({
          meetId: meet.meetId,
          vpfId: row.vpfId,
          purchaseId: row.purchaseId,
          sex: row.sex,
          weightClass: row.weightClass,
          division: row.division,
        })))
        // Belt and braces against a concurrent run: the unique constraint is the
        // real guarantee that re-running never duplicates a lifter.
        .onConflictDoNothing({ target: [meetEntries.meetId, meetEntries.vpfId] })
    }

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
  } catch (error) {
    logger.error("Error generating meet entries", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

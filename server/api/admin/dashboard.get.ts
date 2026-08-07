import { and, count, eq, gte, isNull, lt, lte, sql, sum } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionPurchaseMetadata,
  identityVerifications,
  meetEntries,
  meetResults,
  meets,
  purchases,
  users,
} from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { AdminDashboard } from "~/types/admin"

/**
 * The action queue behind the admin landing page (§1.2).
 *
 * Deliberately not a set of charts: every number here is something a human has to
 * act on, and every list is short enough to work through. Vanity metrics live in
 * `totals`, below the fold.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<AdminDashboard>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can view the dashboard",
      vi: "Chỉ quản trị viên mới có thể xem bảng điều khiển",
    })
    if (!auth.ok) return auth.error

    const meetAlertColumns = {
      meetId: meets.meetId,
      meetName: meets.meetName,
      meetSlug: meets.meetSlug,
      hostDate: meets.hostDate,
      closeRegistration: meets.closeRegistration,
    }

    const [
      pendingVerifications,
      stale,
      missingResults,
      closingSoon,
      needingEntries,
      athleteTotals,
      meetTotal,
      pendingValue,
    ] = await Promise.all([
      db
        .select({ value: count() })
        .from(identityVerifications)
        .where(eq(identityVerifications.status, "pending"))
        .then((rows) => rows[0]?.value ?? 0),

      // Pending for more than a day is the reconciliation signal: the transfer
      // arrived and was never matched, or it never happened.
      db
        .select({ value: count(), amount: sum(purchases.amount) })
        .from(purchases)
        .where(and(
          eq(purchases.status, "pending"),
          lt(purchases.createdAt, sql`now() - interval '24 hours'`),
        ))
        .then((rows) => ({ value: rows[0]?.value ?? 0, amount: Number(rows[0]?.amount ?? 0) })),

      // Host date passed, no results row: nobody has imported the CSV yet.
      db
        .select(meetAlertColumns)
        .from(meets)
        .leftJoin(meetResults, eq(meetResults.meetId, meets.meetId))
        .where(and(
          lt(meets.hostDate, sql`CURRENT_DATE`),
          eq(meets.hidden, false),
          isNull(meetResults.resultId),
        ))
        .groupBy(meets.meetId)
        .orderBy(meets.hostDate),

      db
        .select(meetAlertColumns)
        .from(meets)
        .where(and(
          gte(meets.closeRegistration, sql`CURRENT_DATE`),
          lte(meets.closeRegistration, sql`CURRENT_DATE + 7`),
          eq(meets.hidden, false),
        ))
        .orderBy(meets.closeRegistration),

      // Money is in and the start list has not been generated (§6.5).
      db
        .select({ ...meetAlertColumns, paidRegistrations: count(purchases.purchaseId) })
        .from(competitionPurchaseMetadata)
        .innerJoin(purchases, eq(purchases.purchaseId, competitionPurchaseMetadata.purchaseId))
        .innerJoin(meets, eq(meets.meetId, competitionPurchaseMetadata.meetId))
        .leftJoin(meetEntries, eq(meetEntries.meetId, meets.meetId))
        .where(and(eq(purchases.status, "active"), isNull(meetEntries.entryId)))
        .groupBy(meets.meetId)
        .orderBy(meets.hostDate),

      db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${users.vpfMembershipExpiresAt} IS NULL OR ${users.vpfMembershipExpiresAt} >= CURRENT_DATE)`,
        })
        .from(users)
        .then((rows) => rows[0] ?? { total: 0, active: 0 }),

      db.select({ value: count() }).from(meets).then((rows) => rows[0]?.value ?? 0),

      db
        .select({ amount: sum(purchases.amount) })
        .from(purchases)
        .where(eq(purchases.status, "pending"))
        .then((rows) => Number(rows[0]?.amount ?? 0)),
    ])

    return ok(
      {
        pendingVerifications,
        stalePurchases: stale.value,
        stalePurchaseValue: stale.amount,
        meetsMissingResults: missingResults,
        meetsClosingSoon: closingSoon,
        meetsNeedingEntries: needingEntries,
        totals: {
          athletes: athleteTotals.total,
          activeMembers: Number(athleteTotals.active),
          meets: meetTotal,
          pendingValue,
        },
      },
      { en: "Dashboard retrieved", vi: "Lấy bảng điều khiển thành công" },
    )
  } catch (error) {
    logger.error("Error building admin dashboard", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

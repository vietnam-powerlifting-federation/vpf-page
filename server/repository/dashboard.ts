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

/** The meet columns every dashboard alert list shares. */
const meetAlertColumns = {
  meetId: meets.meetId,
  meetName: meets.meetName,
  meetSlug: meets.meetSlug,
  hostDate: meets.hostDate,
  closeRegistration: meets.closeRegistration,
}

/**
 * Every figure behind the admin landing page, gathered in one round trip.
 *
 * Each of these is something a human has to act on, so they are read together
 * rather than lazily: the page is useless until all of them have arrived, and
 * eight sequential round trips would be eight times the latency for no benefit.
 */
export async function getDashboardCounts() {
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

  return {
    pendingVerifications,
    stale,
    missingResults,
    closingSoon,
    needingEntries,
    athleteTotals,
    meetTotal,
    pendingValue,
  }
}

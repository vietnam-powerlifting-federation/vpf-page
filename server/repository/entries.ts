import { and, asc, eq, inArray } from "drizzle-orm"
import { releaseVouchers } from "~/server/service/vouchers"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionPurchaseMetadata,
  identityVerifications,
  meetEntries,
  meetResults,
  purchases,
  teams,
  users,
} from "~/lib/external/drizzle/migrations/schema"
import type { MeetEntryWithAthlete } from "~/types/entries"

/**
 * The entries roster for one meet, joined to everything the screen and the export
 * both need (admin tools spec §6.5).
 *
 * `meet_results` is joined in so the screen can show whether the assignments that
 * came back from LiftingCast match the ones that went out — a divergence means
 * the meet was re-organised on the day, which is worth knowing and harmless.
 */
export async function fetchEntryRoster(meetId: number): Promise<MeetEntryWithAthlete[]> {
  const rows = await db
    .select({
      entry: meetEntries,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      dob: users.dob,
      nationality: users.nationality,
      address: users.address,
      squatRackPin: users.squatRackPin,
      benchRackPin: users.benchRackPin,
      benchSafetyPin: users.benchSafetyPin,
      benchFootBlock: users.benchFootBlock,
      teamName: teams.teamName,
      refCode: purchases.refCode,
      purchaseStatus: purchases.status,
      mediaPlus: competitionPurchaseMetadata.mediaPlus,
      resultPlatform: meetResults.platform,
      resultSession: meetResults.session,
      resultFlight: meetResults.flight,
      resultLot: meetResults.lot,
      resultId: meetResults.resultId,
    })
    .from(meetEntries)
    .innerJoin(users, eq(users.vpfId, meetEntries.vpfId))
    .leftJoin(teams, eq(teams.teamId, meetEntries.teamId))
    .leftJoin(purchases, eq(purchases.purchaseId, meetEntries.purchaseId))
    .leftJoin(competitionPurchaseMetadata, eq(competitionPurchaseMetadata.purchaseId, meetEntries.purchaseId))
    .leftJoin(
      meetResults,
      and(eq(meetResults.meetId, meetEntries.meetId), eq(meetResults.vpfId, meetEntries.vpfId)),
    )
    .where(eq(meetEntries.meetId, meetId))
    .orderBy(asc(meetEntries.session), asc(meetEntries.flight), asc(meetEntries.lot), asc(users.fullName))

  return rows.map((row) => ({
    ...row.entry,
    fullName: row.fullName,
    email: row.email ?? null,
    phoneNumber: row.phoneNumber ?? null,
    dob: row.dob ?? null,
    nationality: row.nationality ?? null,
    address: row.address ?? null,
    squatRackPin: row.squatRackPin ?? null,
    benchRackPin: row.benchRackPin ?? null,
    benchSafetyPin: row.benchSafetyPin ?? null,
    benchFootBlock: row.benchFootBlock ?? null,
    teamName: row.teamName ?? null,
    refCode: row.refCode ?? null,
    purchaseStatus: row.purchaseStatus ?? null,
    mediaPlus: row.mediaPlus ?? null,
    resultAssignment: row.resultId
      ? {
        platform: row.resultPlatform ?? null,
        session: row.resultSession ?? null,
        flight: row.resultFlight ?? null,
        lot: row.resultLot ?? null,
      }
      : null,
  }))
}

/**
 * Whether results have been imported for a meet. Entries become read-only at
 * that point: the roster that went out is what the meet actually ran on, and
 * editing it afterwards would silently disagree with the recorded results.
 */
export async function meetHasResults(meetId: number): Promise<boolean> {
  const row = await db
    .select({ resultId: meetResults.resultId })
    .from(meetResults)
    .where(eq(meetResults.meetId, meetId))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

export async function meetHasPurchases(meetId: number): Promise<boolean> {
  const row = await db
    .select({ purchaseId: competitionPurchaseMetadata.purchaseId })
    .from(competitionPurchaseMetadata)
    .where(eq(competitionPurchaseMetadata.meetId, meetId))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

/** Scoped to the meet as well as the ids, so an entry id from another meet cannot be edited. */
export async function updateEntries(
  meetId: number,
  entryIds: number[],
  patch: Partial<typeof meetEntries.$inferInsert>,
) {
  return db
    .update(meetEntries)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(meetEntries.meetId, meetId), inArray(meetEntries.entryId, entryIds)))
    .returning({ entryId: meetEntries.entryId })
}

/** An athlete has at most one entry per meet; a duplicate is a no-op, not an error. */
export async function insertEntry(values: typeof meetEntries.$inferInsert) {
  return db
    .insert(meetEntries)
    .values(values)
    .onConflictDoNothing({ target: [meetEntries.meetId, meetEntries.vpfId] })
    .returning()
    .then((rows) => rows[0] ?? null)
}

export async function findEntry(meetId: number, entryId: number) {
  return db
    .select()
    .from(meetEntries)
    .where(and(eq(meetEntries.entryId, entryId), eq(meetEntries.meetId, meetId)))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/**
 * Update one entry, and — when the change is a withdrawal — cancel the purchase
 * behind it and hand its vouchers back.
 *
 * One transaction, because the alternative is an athlete withdrawn from the meet
 * while still holding a pending charge, or a voucher destroyed with nothing to
 * show for it. The purchase UPDATE re-asserts `status = 'pending'` so an
 * already-approved payment is never cancelled out from under finance.
 */
export async function updateEntryWithWithdrawal(
  entryId: number,
  patch: Partial<typeof meetEntries.$inferInsert>,
  withdrawal: { purchaseId: number } | null,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(meetEntries)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(meetEntries.entryId, entryId))
      .returning()

    if (withdrawal) {
      await releaseVouchers(tx, withdrawal.purchaseId)
      await tx
        .update(purchases)
        .set({ status: "cancelled", cancelledAt: new Date().toISOString() })
        .where(and(eq(purchases.purchaseId, withdrawal.purchaseId), eq(purchases.status, "pending")))
    }

    return row
  })
}

/** The eligibility inputs the registration wizard and the registration endpoint both read. */
export async function findRegistrationAccount(vpfId: string) {
  return db
    .select({
      dob: users.dob,
      drugViolate: users.drugViolate,
      squatRackPin: users.squatRackPin,
      benchRackPin: users.benchRackPin,
      benchSafetyPin: users.benchSafetyPin,
      benchFootBlock: users.benchFootBlock,
      competitionPhotoUrl: users.competitionPhotoUrl,
      vpfMembershipExpiresAt: users.vpfMembershipExpiresAt,
      emailVerified: users.emailVerified,
      identityVerified: users.identityVerified,
    })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function findVerificationStatusAndDob(vpfId: string) {
  return db
    .select({ status: identityVerifications.status, dob: identityVerifications.dob })
    .from(identityVerifications)
    .where(eq(identityVerifications.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/** Athletes with an active competition purchase for a meet — the source roster for generation. */
export async function listPaidRegistrations(meetId: number) {
  return db
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
      eq(competitionPurchaseMetadata.meetId, meetId),
      eq(purchases.status, "active"),
    ))
}

export async function listEnteredVpfIds(meetId: number): Promise<string[]> {
  const rows = await db
    .select({ vpfId: meetEntries.vpfId })
    .from(meetEntries)
    .where(eq(meetEntries.meetId, meetId))
  return rows.map((row) => row.vpfId)
}

/**
 * Bulk-create entries, ignoring any that already exist. The unique constraint on
 * (meetId, vpfId) — not this filter — is the real guarantee that re-running
 * generation never duplicates a lifter.
 */
export async function insertEntries(rows: (typeof meetEntries.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(meetEntries)
    .values(rows)
    .onConflictDoNothing({ target: [meetEntries.meetId, meetEntries.vpfId] })
}

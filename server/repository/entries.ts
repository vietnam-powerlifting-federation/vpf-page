import { and, asc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionPurchaseMetadata,
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

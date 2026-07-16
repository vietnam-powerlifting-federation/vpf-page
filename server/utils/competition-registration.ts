import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  meets,
  userViolations,
  competitionBanList,
  purchases,
  competitionPurchaseMetadata,
} from "~/lib/external/drizzle/migrations/schema"
import type { BanGate, ViolationOutcome } from "~/types/competitions"

export type MeetRow = typeof meets.$inferSelect

/** Resolve a meet by numeric id or slug (mirrors the /api/meets/[id] convention). */
export async function resolveMeet(identifier: string): Promise<MeetRow | null> {
  const idNum = Number.parseInt(identifier, 10)
  const isNumericId = !Number.isNaN(idNum) && String(idNum) === identifier
  return db
    .select()
    .from(meets)
    .where(isNumericId ? eq(meets.meetId, idNum) : eq(meets.meetSlug, identifier))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/** Registration is open when today is within [startRegistration, closeRegistration]. */
export function isRegistrationOpen(meet: MeetRow, today = new Date()): boolean {
  const todayStr = today.toISOString().slice(0, 10)
  if (meet.startRegistration && todayStr < meet.startRegistration) return false
  if (meet.closeRegistration && todayStr > meet.closeRegistration) return false
  return true
}

/**
 * Run the three ban gates in order for an identity-verified athlete.
 * Violation level = count of the athlete's `user_violations` rows still in force
 * relative to the meet's system year (a null expire year never expires).
 */
export async function evaluateBanGates(vpfId: string, meet: MeetRow, drugViolate: boolean): Promise<BanGate> {
  const violationRows = await db
    .select({ id: userViolations.id })
    .from(userViolations)
    .where(
      and(
        eq(userViolations.vpfId, vpfId),
        or(isNull(userViolations.expireYear), sql`${userViolations.expireYear} >= ${meet.systemYear}`),
      ),
    )

  const violationLevel = violationRows.length
  const violationOutcome: ViolationOutcome = violationLevel >= 2 ? "blocked" : violationLevel === 1 ? "pledge" : "ok"

  const dopingBanned = drugViolate === true

  const ban = await db
    .select({ reason: competitionBanList.reason })
    .from(competitionBanList)
    .where(and(eq(competitionBanList.meetId, meet.meetId), eq(competitionBanList.vpfId, vpfId)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  const blocked = violationOutcome === "blocked" || dopingBanned || Boolean(ban)

  return {
    violationLevel,
    violationOutcome,
    dopingBanned,
    competitionBanned: Boolean(ban),
    competitionBanReason: ban?.reason ?? null,
    blocked,
  }
}

/** Whether the athlete already has a live (pending/active) entry for this meet. */
export async function hasExistingRegistration(vpfId: string, meetId: number): Promise<boolean> {
  const row = await db
    .select({ purchaseId: competitionPurchaseMetadata.purchaseId })
    .from(competitionPurchaseMetadata)
    .innerJoin(purchases, eq(purchases.purchaseId, competitionPurchaseMetadata.purchaseId))
    .where(
      and(
        eq(competitionPurchaseMetadata.meetId, meetId),
        eq(purchases.vpfId, vpfId),
        inArray(purchases.status, ["pending", "active"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)
  return Boolean(row)
}

/** VPF membership is owed when the athlete's current expiry does not cover the meet's year. */
export function isMembershipOwed(vpfMembershipExpiresAt: string | null, systemYear: number): boolean {
  if (!vpfMembershipExpiresAt) return true
  const expiryYear = Number(vpfMembershipExpiresAt.slice(0, 4))
  return expiryYear < systemYear
}

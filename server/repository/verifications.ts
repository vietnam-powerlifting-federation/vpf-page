import { desc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import type { IdentityVerification } from "~/types/verifications"

/**
 * `users.emailVerified` and `users.identityVerified` are the settled flags; the
 * `identity_verifications` row is the submission behind the second one. Both are
 * read together because the verification screen shows the outcome and the
 * pending submission side by side.
 */
export async function findVerificationFlags(
  vpfId: string,
): Promise<{ emailVerified: boolean; identityVerified: boolean } | null> {
  return db
    .select({ emailVerified: users.emailVerified, identityVerified: users.identityVerified })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function findVerificationSubmission(vpfId: string): Promise<IdentityVerification | null> {
  return db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function findEmailVerified(vpfId: string): Promise<boolean | null> {
  const row = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0])
  return row ? row.emailVerified : null
}

/**
 * An athlete has at most one verification row, so a resubmission overwrites the
 * previous one rather than adding to a history — including resetting the review
 * state, which the caller supplies in `values`.
 */
export async function upsertVerificationSubmission(
  values: typeof identityVerifications.$inferInsert,
): Promise<IdentityVerification | null> {
  return db
    .insert(identityVerifications)
    .values(values)
    .onConflictDoUpdate({
      target: identityVerifications.vpfId,
      set: {
        fullName: values.fullName,
        nationality: values.nationality,
        dob: values.dob,
        nationalId: values.nationalId,
        address: values.address,
        phoneNumber: values.phoneNumber,
        idCardFrontUrl: values.idCardFrontUrl,
        status: values.status,
        reviewedBy: values.reviewedBy,
        reviewedAt: values.reviewedAt,
        reviewNote: values.reviewNote,
        updatedAt: values.updatedAt,
      },
    })
    .returning()
    .then((rows) => rows[0] ?? null)
}

export async function listVerifications(status?: IdentityVerification["status"]) {
  return db
    .select({
      verification: identityVerifications,
      userEmail: users.email,
      userName: users.fullName,
    })
    .from(identityVerifications)
    .innerJoin(users, eq(identityVerifications.vpfId, users.vpfId))
    .where(status ? eq(identityVerifications.status, status) : undefined)
    .orderBy(desc(identityVerifications.submittedAt))
}

export async function findVerificationById(id: number): Promise<IdentityVerification | null> {
  return db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function updateVerification(
  id: number,
  patch: Partial<typeof identityVerifications.$inferInsert>,
): Promise<IdentityVerification | null> {
  return db
    .update(identityVerifications)
    .set(patch)
    .where(eq(identityVerifications.id, id))
    .returning()
    .then((rows) => rows[0] ?? null)
}

/**
 * Approval copies the verified details onto the athlete's official record;
 * rejection only clears the flag, so it always mirrors whether the athlete's
 * *current* submission is approved.
 */
export async function applyVerificationToAthlete(
  vpfId: string,
  approved: { fullName: string; nationality: string; dob: number; nationalId: string; address: string; phoneNumber: string } | null,
): Promise<void> {
  await db
    .update(users)
    .set(approved ? { ...approved, identityVerified: true } : { identityVerified: false })
    .where(eq(users.vpfId, vpfId))
}

export async function findAthleteEmail(vpfId: string): Promise<string | null> {
  return db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0]?.email ?? null)
}

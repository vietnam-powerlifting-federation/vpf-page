import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"

/**
 * The credential columns, and the only module that reads them.
 *
 * `password`, `emailVerificationCode` and `passwordResetCode` are exactly the
 * fields `UserPrivate` excludes — no profile response may ever carry them. The
 * athletes repository cannot reach them because its select maps are pinned to
 * that type, so keeping them here means a password hash cannot leak into a
 * profile payload by someone adding a column to the wrong select map.
 */

export type LoginCandidate = {
  vpfId: string
  email: string | null
  password: string
  role: "user" | "admin"
  emailVerified: boolean
}

/** Athletes may sign in with either their VPF id or their email address. */
export async function findLoginCandidate(
  identifier: { vpfId: string } | { email: string },
): Promise<LoginCandidate | null> {
  return db
    .select({
      vpfId: users.vpfId,
      email: users.email,
      password: users.password,
      role: users.role,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where("vpfId" in identifier ? eq(users.vpfId, identifier.vpfId) : eq(users.email, identifier.email))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function findVpfIdByEmail(email: string): Promise<string | null> {
  return db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]?.vpfId ?? null)
}

export async function emailExists(email: string): Promise<boolean> {
  const row = await db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

export async function insertUser(values: typeof users.$inferInsert) {
  return db
    .insert(users)
    .values(values)
    .returning({ vpfId: users.vpfId, role: users.role })
    .then((rows) => rows[0])
}

// --- password reset -------------------------------------------------------

export type PasswordResetState = {
  vpfId: string
  resetCode: string | null
  resetExpiresAt: string | null
}

export async function findPasswordResetState(email: string): Promise<PasswordResetState | null> {
  return db
    .select({
      vpfId: users.vpfId,
      resetCode: users.passwordResetCode,
      resetExpiresAt: users.passwordResetExpiresAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function setPasswordResetCode(
  vpfId: string,
  code: string,
  expiresAt: string,
): Promise<void> {
  await db
    .update(users)
    .set({ passwordResetCode: code, passwordResetExpiresAt: expiresAt })
    .where(eq(users.vpfId, vpfId))
}

/** Consumes the reset code in the same write that changes the password, so it cannot be replayed. */
export async function setPasswordAndClearReset(vpfId: string, hashedPassword: string): Promise<void> {
  await db
    .update(users)
    .set({ password: hashedPassword, passwordResetCode: null, passwordResetExpiresAt: null })
    .where(eq(users.vpfId, vpfId))
}

// --- email verification ---------------------------------------------------

export type EmailVerificationState = {
  email: string | null
  emailVerified: boolean
  code: string | null
  expiresAt: string | null
}

export async function findEmailVerificationState(vpfId: string): Promise<EmailVerificationState | null> {
  return db
    .select({
      email: users.email,
      emailVerified: users.emailVerified,
      code: users.emailVerificationCode,
      expiresAt: users.emailVerificationExpiresAt,
    })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function setEmailVerificationCode(
  vpfId: string,
  code: string,
  expiresAt: string,
): Promise<void> {
  await db
    .update(users)
    .set({ emailVerificationCode: code, emailVerificationExpiresAt: expiresAt })
    .where(eq(users.vpfId, vpfId))
}

export async function markEmailVerified(vpfId: string): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiresAt: null })
    .where(eq(users.vpfId, vpfId))
}

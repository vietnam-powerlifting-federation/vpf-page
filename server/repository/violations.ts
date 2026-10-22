import { desc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations, users } from "~/lib/external/drizzle/migrations/schema"

/** A violation row joined to the athlete it belongs to; the level is derived, not stored. */
export type ViolationRow = Awaited<ReturnType<typeof listViolations>>[number]

export async function listViolations(vpfId?: string) {
  return db
    .select({
      id: userViolations.id,
      vpfId: userViolations.vpfId,
      createdAt: userViolations.createdAt,
      note: userViolations.note,
      expireYear: userViolations.expireYear,
      userName: users.fullName,
      userEmail: users.email,
    })
    .from(userViolations)
    .innerJoin(users, eq(users.vpfId, userViolations.vpfId))
    .where(vpfId ? eq(userViolations.vpfId, vpfId) : undefined)
    .orderBy(desc(userViolations.createdAt))
}

export async function findAthleteNameAndEmail(vpfId: string) {
  return db
    .select({ vpfId: users.vpfId, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function insertViolation(values: typeof userViolations.$inferInsert) {
  return db.insert(userViolations).values(values).returning().then((rows) => rows[0])
}

export async function updateViolation(
  id: number,
  patch: Partial<typeof userViolations.$inferInsert>,
) {
  return db
    .update(userViolations)
    .set(patch)
    .where(eq(userViolations.id, id))
    .returning()
    .then((rows) => rows[0] ?? null)
}

/**
 * A hard delete, matching the level rule: the level is a row count, so a
 * "cancelled" row left in place would keep counting against the athlete unless
 * every query learned to exclude it.
 */
export async function deleteViolation(id: number) {
  return db
    .delete(userViolations)
    .where(eq(userViolations.id, id))
    .returning({ id: userViolations.id, vpfId: userViolations.vpfId })
    .then((rows) => rows[0] ?? null)
}

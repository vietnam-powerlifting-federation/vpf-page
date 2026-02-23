import path from "node:path"
import bcrypt from "bcryptjs"
import { inArray } from "drizzle-orm"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db } from "../../lib/external/drizzle/drizzle"
import {
  teams,
  meets,
  users,
  meetResults,
  legacyMeetResults,
  userViolations,
} from "../../lib/external/drizzle/migrations/schema"
import {
  fixtureTeams,
  fixtureMeets,
  fixtureUsers,
  fixtureMeetResults,
  fixtureLegacyMeetResults,
} from "../fixtures/data"

/** Lower than production for faster test seed; only used in test setup. */
const SALT_ROUNDS = 4

const migrationsFolder = path.resolve(
  process.cwd(),
  "lib/external/drizzle/migrations"
)

/** Run migrations on the test database so tables exist. Safe to call multiple times. */
export async function runTestDatabaseMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder })
}

export async function seedTestDatabase(): Promise<void> {
  const hashedUsers = await Promise.all(
    fixtureUsers.map(async (u) => {
      const { password, ...rest } = u
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      return { ...rest, password: hashedPassword }
    })
  )

  await db
    .insert(teams)
    .values(fixtureTeams as unknown as typeof teams.$inferInsert[])
    .onConflictDoNothing({ target: teams.teamId })
  await db
    .insert(meets)
    .values(fixtureMeets as unknown as typeof meets.$inferInsert[])
    .onConflictDoNothing({ target: meets.meetId })
  await db
    .insert(users)
    .values(hashedUsers as unknown as typeof users.$inferInsert[])
    .onConflictDoNothing({ target: users.vpfId })
  await db
    .insert(meetResults)
    .values(fixtureMeetResults as unknown as typeof meetResults.$inferInsert[])
    .onConflictDoNothing({ target: [meetResults.meetId, meetResults.vpfId] })
  await db
    .insert(legacyMeetResults)
    .values(fixtureLegacyMeetResults as unknown as typeof legacyMeetResults.$inferInsert[])
    .onConflictDoNothing({ target: [legacyMeetResults.meetId, legacyMeetResults.vpfId] })
}

export async function teardownTestDatabase(): Promise<void> {
  const meetIds = fixtureMeetResults.map((r) => r.meetId)
  const legacyMeetIds = fixtureLegacyMeetResults.map((r) => r.meetId)
  const vpfIds = fixtureUsers.map((u) => u.vpfId)
  const teamIds = fixtureTeams.map((t) => t.teamId)

  await db.delete(legacyMeetResults).where(inArray(legacyMeetResults.meetId, [...new Set(legacyMeetIds)]))
  await db.delete(meetResults).where(inArray(meetResults.meetId, [...new Set(meetIds)]))
  await db.delete(userViolations).where(inArray(userViolations.vpfId, vpfIds))
  await db.delete(users).where(inArray(users.vpfId, vpfIds))
  await db.delete(meets).where(inArray(meets.meetId, [...new Set([...meetIds, ...fixtureMeets.map((m) => m.meetId)])]))
  await db.delete(teams).where(inArray(teams.teamId, teamIds))
}

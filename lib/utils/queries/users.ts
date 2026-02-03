import { legacyMeetResults, meetResults, users } from "~/lib/external/drizzle/migrations/schema"
import type { MeetPublic } from "~/types/meets"
import type { UserPrivate, UserPublic } from "~/types/users"
import { db } from "~/lib/external/drizzle/drizzle"
import { eq, inArray } from "drizzle-orm"

export const userPrivateSelect = {
  vpfId: users.vpfId,
  fullName: users.fullName,
  nationality: users.nationality,
  dob: users.dob,
  nationalId: users.nationalId,
  address: users.address,
  phoneNumber: users.phoneNumber,
  squatRackPin: users.squatRackPin,
  benchRackPin: users.benchRackPin,
  benchSafetyPin: users.benchSafetyPin,
  benchFootBlock: users.benchFootBlock,
  legacyEmail: users.legacyEmail,
  active: users.active,
  drugViolate: users.drugViolate,
  notes: users.notes,
  instagramUsername: users.instagramUsername,
  slug: users.slug,
  decorator1: users.decorator1,
  decorator2: users.decorator2,
  email: users.email,
  role: users.role,
} satisfies Record<keyof UserPrivate, unknown>

export const userPublicSelect = {
  vpfId: users.vpfId,
  fullName: users.fullName,
  nationality: users.nationality,
  dob: users.dob,
  instagramUsername: users.instagramUsername,
  slug: users.slug,
  decorator1: users.decorator1,
  decorator2: users.decorator2,
} satisfies Record<keyof UserPublic, unknown>

export async function getUsersJoinMeets(meets: MeetPublic[]): Promise<UserPublic[]> {
  const legacyMeetIds = meets
    .filter(m => m.legacy === true)
    .map(m => m.meetId)

  const nonLegacyMeetIds = meets
    .filter(m => m.legacy === false)
    .map(m => m.meetId)

  const legacyMeetAthletes = await db
    .select(userPublicSelect)
    .from(legacyMeetResults)
    .innerJoin(users, eq(legacyMeetResults.vpfId, users.vpfId))
    .where(inArray(legacyMeetResults.meetId, legacyMeetIds))
  const nonLegacyMeetAthletes = await db
    .select(userPublicSelect)
    .from(meetResults)
    .innerJoin(users, eq(meetResults.vpfId, users.vpfId))
    .where(inArray(meetResults.meetId, nonLegacyMeetIds))

  // Get unique users (in case of duplicates)
  const allAthletesMap = new Map<string, UserPublic>()
  for (const user of [...legacyMeetAthletes, ...nonLegacyMeetAthletes]) {
    allAthletesMap.set(user.vpfId, user)
  }

  return Array.from(allAthletesMap.values())
}
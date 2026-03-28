import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"
import type { MeetPublic } from "~/types/meets"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { VipBenefits } from "~/types/vip"

type User = InferSelectModel<typeof users>
type UserPrivate = Omit<User, "password">
type UserPublic = Omit<User, "password" | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "vpfMembershipExpiresAt" | "vipMembershipExpiresAt" | "legacyEmail" | "notes" | "drugViolate" | "role">

type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
}

export type { UserPrivate, UserPublic, AthleteDetailsData }
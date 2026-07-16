import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"
import type { MeetPublic } from "~/types/meets"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { VipBenefits } from "~/types/vip"

type User = InferSelectModel<typeof users>
// Internal email-verification fields are never part of the user-facing profile.
type UserInternal = "password" | "identityVerified" | "emailVerified" | "emailVerificationCode" | "emailVerificationExpiresAt"
type UserPrivate = Omit<User, UserInternal>
type UserPublic = Omit<User, UserInternal | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "vpfMembershipExpiresAt" | "vipMembershipExpiresAt" | "legacyEmail" | "notes" | "drugViolate" | "role">

type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
}

type UserPublicWithDecorators = UserPublic & { decorator1?: string | null; decorator2?: string | null }

export type { UserPrivate, UserPublic, UserPublicWithDecorators, AthleteDetailsData }
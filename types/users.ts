import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"
import type { MeetPublic } from "~/types/meets"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { VipBenefits } from "~/types/vip"

type User = InferSelectModel<typeof users>
// Internal email-verification fields are never part of the user-facing profile.
type UserInternal = "password" | "identityVerified" | "emailVerified" | "emailVerificationCode" | "emailVerificationExpiresAt" | "passwordResetCode" | "passwordResetExpiresAt"
type UserPrivate = Omit<User, UserInternal>
type UserPublic = Omit<User, UserInternal | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "vpfMembershipExpiresAt" | "vipMembershipExpiresAt" | "legacyEmail" | "notes" | "drugViolate" | "role" | "competitionPhotoUrl">

type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
}

type UserPublicWithDecorators = UserPublic & { decorator1?: string | null; decorator2?: string | null }

/**
 * One page of `GET /api/athletes`. Paginated rather than a bare array because
 * the admin list is the one screen that has to reach every athlete, including
 * lapsed members, and it will not stay small.
 */
type AthleteListPage = {
  items: (UserPrivate | UserPublic)[]
  total: number
  page: number
  pageSize: number
}

export type { UserPrivate, UserPublic, UserPublicWithDecorators, AthleteDetailsData, AthleteListPage }
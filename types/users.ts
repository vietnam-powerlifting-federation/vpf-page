import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { VipBenefits } from "~/types/vip"

type User = InferSelectModel<typeof users>
// Internal email-verification fields are never part of the user-facing profile.
type UserInternal = "password" | "identityVerified" | "emailVerified" | "emailVerificationCode" | "emailVerificationExpiresAt" | "passwordResetCode" | "passwordResetExpiresAt"
type UserPrivate = Omit<User, UserInternal>
type UserPublic = Omit<User, UserInternal | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "vpfMembershipExpiresAt" | "vipMembershipExpiresAt" | "legacyEmail" | "notes" | "drugViolate" | "role" | "competitionPhotoUrl">

/**
 * `GET /api/athletes/[id]` — one athlete's record.
 *
 * `scope` names which column set the server decided to answer with, so a caller
 * needing private fields has to check rather than assume. Without it, an admin
 * screen whose session had expired would receive public columns and silently
 * read `undefined` for everything it wanted.
 */
type AthleteRecordData =
  | { scope: "private"; athlete: UserPrivate; vipSettings: VipBenefits | null }
  | { scope: "public"; athlete: UserPublic; vipSettings: VipBenefits | null }

/**
 * `GET /api/athletes/[id]/profile` — the competition history aggregate.
 *
 * Every field is always present. This replaced a set of `include*` query flags
 * that made the response shape a function of the query string, which the type
 * could not express and every caller had to narrow by hand.
 */
type AthleteProfileData = {
  athlete: UserPublic
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  records: LiftRecord[]
  vipSettings: VipBenefits | null
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

export type {
  UserPrivate,
  UserPublic,
  UserPublicWithDecorators,
  AthleteRecordData,
  AthleteProfileData,
  AthleteListPage,
}
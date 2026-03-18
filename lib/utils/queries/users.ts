import { users } from "~/lib/external/drizzle/migrations/schema"
import type { UserPrivate, UserPublic } from "~/types/users"

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
  vpfMembershipExpiresAt: users.vpfMembershipExpiresAt,
  vipMembershipExpiresAt: users.vipMembershipExpiresAt,
  drugViolate: users.drugViolate,
  notes: users.notes,
  slug: users.slug,
  email: users.email,
  role: users.role,
} satisfies Record<keyof UserPrivate, unknown>

export const userPublicSelect = {
  vpfId: users.vpfId,
  fullName: users.fullName,
  nationality: users.nationality,
  dob: users.dob,
  slug: users.slug,
} satisfies Record<keyof UserPublic, unknown>
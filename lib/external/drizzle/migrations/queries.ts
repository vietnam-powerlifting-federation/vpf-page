import { users } from "./schema"
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
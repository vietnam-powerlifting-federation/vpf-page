import type { UserPrivate, UserPublic } from "~/types/users"

/**
 * Converts a UserPrivate to UserPublic by omitting sensitive fields
 */
export function toUserPublic(user: UserPrivate): UserPublic {
  const {
    nationalId,
    phoneNumber,
    address,
    squatRackPin,
    benchRackPin,
    benchSafetyPin,
    benchFootBlock,
    legacyEmail,
    email,
    active,
    notes,
    drugViolate,
    role,
    password,
    ...publicUser
  } = user

  return publicUser as UserPublic
}


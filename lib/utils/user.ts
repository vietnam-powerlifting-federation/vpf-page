import type { UserPrivate, UserPublic } from "~/types/users"

export function toUserPublic(user: UserPrivate): UserPublic {
  const {
    password,
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
    ...publicUser
  } = user

  return publicUser as UserPublic
}

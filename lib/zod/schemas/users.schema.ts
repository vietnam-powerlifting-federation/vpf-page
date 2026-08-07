// db/schema/users.zod.ts
import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { users } from "~/lib/external/drizzle/migrations/schema"

export const UserSelfPatchSchema = createSelectSchema(users, {
  email: z.email().nullable()
}).partial().pick({
  email: true,
  nationality: true,
  dob: true,
  address: true,
  phoneNumber: true,
  squatRackPin: true,
  benchRackPin: true,
  benchSafetyPin: true,
  benchFootBlock: true,
})

export const UserRequiredSchema = createSelectSchema(users, {
  email: z.email().nullable()
}).pick({
  email: true,
  nationality: true,
  dob: true,
  address: true,
  phoneNumber: true,
})

/**
 * What an admin may change on someone else's account (admin tools spec §4.1).
 *
 * Wider than the self-service patch on purpose: verification approval copies the
 * CCCD fields onto the athlete's record, and a typo there is otherwise permanent.
 * Note `identityVerified` is deliberately absent — its invariant is maintained in
 * exactly one place (the verification review handler), and an admin correcting a
 * name on an approved record must not silently desync it.
 */
export const UserAdminPatchSchema = createSelectSchema(users, {
  email: z.email().nullable(),
}).partial().pick({
  fullName: true,
  email: true,
  nationality: true,
  dob: true,
  nationalId: true,
  address: true,
  phoneNumber: true,
  squatRackPin: true,
  benchRackPin: true,
  benchSafetyPin: true,
  benchFootBlock: true,
  vpfMembershipExpiresAt: true,
  vipMembershipExpiresAt: true,
  drugViolate: true,
  notes: true,
  slug: true,
  role: true,
}).extend({
  /**
   * A doping ban is a registration gate (`evaluateBanGates`) with real
   * consequences for an athlete, so setting or clearing it must say why. Recorded
   * in the server log alongside the actor; required whenever `drugViolate` moves.
   */
  drugViolateReason: z.string().trim().min(1).max(500).optional(),
})
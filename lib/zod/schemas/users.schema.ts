// db/schema/users.zod.ts
import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { users } from "~/lib/external/drizzle/migrations/schema"

export const UserSelfPatchSchema = createSelectSchema(users, {
  email: z.email()
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
  instagramUsername: true,
})

export const UserRequiredSchema = createSelectSchema(users, {
  email: z.email()
}).pick({
  email: true,
  nationality: true,
  dob: true,
  address: true,
  phoneNumber: true,
})
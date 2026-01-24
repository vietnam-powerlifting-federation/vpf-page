import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"

type UserPrivate = InferSelectModel<typeof users>
type UserPublic = Omit<UserPrivate, "password" | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "active" | "legacyEmail" | "notes" | "drugViolate" | "role">

export type { UserPrivate, UserPublic }
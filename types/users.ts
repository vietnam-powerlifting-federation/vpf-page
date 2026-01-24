import type { InferSelectModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"

type User = InferSelectModel<typeof users>
type UserPrivate = Omit<User, "password">
type UserPublic = Omit<User, "password" | "nationalId" | "phoneNumber" | "address" | "squatRackPin" | "benchRackPin" | "benchSafetyPin" | "benchFootBlock" | "legacyEmail" | "email" | "active" | "legacyEmail" | "notes" | "drugViolate" | "role">

export type { UserPrivate, UserPublic }
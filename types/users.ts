import type { InferSelectModel, InferInsertModel } from "drizzle-orm"
import type { users } from "~/lib/external/drizzle/migrations/schema"
type User = InferSelectModel<typeof users>
type NewUser = InferInsertModel<typeof users>

export type { User, NewUser }
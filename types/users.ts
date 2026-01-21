import type { InferSelectModel, InferInsertModel } from "drizzle-orm"
import type { members } from "@/db/schema"
type User = InferSelectModel<typeof members>
type NewUser = InferInsertModel<typeof members>

export type { User, NewUser }
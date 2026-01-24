import type { InferSelectModel } from "drizzle-orm"
import type { meets } from "~/lib/external/drizzle/migrations/schema"

type MeetPrivate = InferSelectModel<typeof meets>
type MeetPublic = MeetPrivate

export type { MeetPrivate, MeetPublic }
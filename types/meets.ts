import type { InferSelectModel } from "drizzle-orm"
import type { meets } from "~/lib/external/drizzle/migrations/schema"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"

type MeetPrivate = InferSelectModel<typeof meets>
type MeetPublic = MeetPrivate

type MeetResult = Result & {
  squatPlacement: number
  benchPlacement: number
  deadliftPlacement: number
}

type MeetDataPayload = {
  meet: MeetPublic
  results: MeetResult[]
  athletes: UserPublic[]
}

export type { MeetPrivate, MeetPublic, MeetResult, MeetDataPayload }
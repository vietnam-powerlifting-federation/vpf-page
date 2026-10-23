import type { InferSelectModel } from "drizzle-orm"
import type { meets } from "~/lib/external/drizzle/migrations/schema"
import type { Result } from "~/types/results"
import type { Division, Sex } from "~/types/union-types"
import type { UserPublicWithDecorators } from "~/types/users"

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
  athletes: UserPublicWithDecorators[]
}

/** A competition result joined with its athlete (the athlete is missing for removed accounts). */
type MeetRow = MeetResult & { athlete?: UserPublicWithDecorators }

/** A meet's results by category, then division, each in weight-class and placement order. */
type GroupedByGenderDivision = Array<{
  sex: Sex
  divisions: Array<{ division: Division; results: MeetRow[] }>
}>

export type { MeetPrivate, MeetPublic, MeetResult, MeetDataPayload, MeetRow, GroupedByGenderDivision }
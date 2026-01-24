import type { InferSelectModel } from "drizzle-orm"
import type { meetResults, legacyMeetResults } from "~/lib/external/drizzle/migrations/schema"

// contains lift1, lift2, lift3 etc.
export type MeetResultRaw = InferSelectModel<typeof meetResults> 

// contains best_lift instead
export type LegacyMeetResultRaw = InferSelectModel<typeof legacyMeetResults>

// contains all and total, gl and placement
export type MeetResult = MeetResultRaw & LegacyMeetResultRaw & {
  total: number | null
  gl: number | null
  placement: number
}
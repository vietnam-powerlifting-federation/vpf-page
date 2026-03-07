import type { InferSelectModel } from "drizzle-orm"
import type { meetResults, legacyMeetResults } from "~/lib/external/drizzle/migrations/schema"

// contains lift1, lift2, lift3 etc.
export type ResultRaw = InferSelectModel<typeof meetResults> 

// contains best_lift instead
export type LegacyResultRaw = InferSelectModel<typeof legacyMeetResults>

// contains all and total, gl and placement
export type Result = ResultRaw & LegacyResultRaw & {
  total: number | null
  gl: number | null
  placement: number
}

// include rank for ranking page
export type ResultRanked = Result & {
  rank: number
}

export type PersonalBestSummary = {
  squat: number | null
  bench: number | null
  deadlift: number | null
  total: number | null
}
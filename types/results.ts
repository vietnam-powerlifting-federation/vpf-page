import type { InferSelectModel } from "drizzle-orm"
import type { Division, Sex } from "~/types/union-types"
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
/**
 * One row of the public rankings, slimmed from `ResultRanked` + its athlete so
 * the server-rendered payload carries only what the table shows.
 */
export type RankingRow = {
  rank: number
  vpfId: string
  name: string
  slug: string | null
  sex: Sex
  weightClass: number | null
  division: Division | null
  gl: number | null
  total: number | null
  bestSquat: number | null
  bestBench: number | null
  bestDeadlift: number | null
}

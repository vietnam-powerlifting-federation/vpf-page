import type { Division, Sex } from "./union-types"

export type LiftRecord = {
  resultId: string
  lift: "total" | "squat" | "bench" | "deadlift"
  attempt: 1 | 2 | 3
  recordWeight: number
  recordDivision: Division
  status?: "holding" | "broken"
}

/** A record joined with its result, athlete and meet: what the records page shows. */
export type RecordRow = {
  lift: LiftRecord["lift"]
  division: Division
  sex: Sex
  weightClass: number
  weight: number
  attempt: number
  vpfId: string
  name: string
  slug: string | null
  dob: number | null
  bodyWeight: number | null
  meetName: string | null
  meetSlug: string | null
  hostDate: string | null
}

import type { Division } from "./union-types"

export type LiftRecord = {
  resultId: string
  lift: "total" | "squat" | "bench" | "deadlift"
  attempt: 1 | 2 | 3
  recordWeight: number
  recordDivision: Division
  status?: "holding" | "broken"
}

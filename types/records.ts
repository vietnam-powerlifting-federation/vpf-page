import type { Result } from "./results"
import type { Division } from "./union-types"

export type LiftRecord = Result & {
  lift: "total" | "squat" | "bench" | "deadlift"
  attempt?: 1 | 2 | 3
  recordWeight: number 
  recordDivision: Division
}
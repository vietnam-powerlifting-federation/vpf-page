import { RECORD_DIVISION_OVERRIDE } from "~/lib/constants/constants"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { RankedDivision } from "~/types/union-types"

/**
 * Pure record maths only. Anything that reads the database or caches its output
 * lives in server/service/records.ts — these helpers are shared by the records
 * page, the record history and an athlete's profile, and none of them should
 * reach for a query of their own.
 */

export function getDivisionFromAge(age: number): RankedDivision {
  if (age >= 14 && age <= 18) return "subjr"
  if (age >= 19 && age <= 23) return "jr"
  if (age >= 40 && age <= 49) return "mas1"
  if (age >= 50 && age <= 59) return "mas2"
  if (age >= 60 && age <= 69) return "mas3"
  if (age >= 70) return "mas4"
  return "open"
}

/**
 * Resolves the record divisions an athlete's attempt should count towards, based
 * on their age at the meet. Falls back to "open" when age is unknown, and expands
 * via RECORD_DIVISION_OVERRIDE (e.g. juniors also hold open records).
 */
export function getTargetDivisions(dob: number | null, systemYear: number | null): RankedDivision[] {
  const originalDiv: RankedDivision = (dob === null || systemYear === null)
    ? "open"
    : getDivisionFromAge(systemYear - dob)

  return (originalDiv in RECORD_DIVISION_OVERRIDE
    ? RECORD_DIVISION_OVERRIDE[originalDiv]
    : [originalDiv]) as RankedDivision[]
}

export function getBestAttempt(
  lift1: number | null,
  lift2: number | null,
  lift3: number | null
): { weight: number; attempt: 1 | 2 | 3 } | null {
  const attempts = [
    { weight: lift1, attempt: 1 as const },
    { weight: lift2, attempt: 2 as const },
    { weight: lift3, attempt: 3 as const },
  ].filter(a => a.weight !== null && a.weight > 0) as Array<{ weight: number; attempt: 1 | 2 | 3 }>

  if (attempts.length === 0) return null

  return attempts.reduce((best, current) =>
    current.weight > best.weight ? current : best
  )
}

/**
 * Running total after each deadlift attempt: best squat + best bench + the best
 * deadlift achieved up to and including that attempt.
 */
export function getRunningTotals(result: Result): Array<{ attempt: 1 | 2 | 3; weight: number }> {
  const bestSquatW = getBestAttempt(result.squat1, result.squat2, result.squat3)?.weight ?? 0
  const bestBenchW = getBestAttempt(result.bench1, result.bench2, result.bench3)?.weight ?? 0

  return ([1, 2, 3] as const).map((attempt) => ({
    attempt,
    weight: bestSquatW + bestBenchW + Math.max(
      result.deadlift1 ?? 0,
      attempt >= 2 ? (result.deadlift2 ?? 0) : 0,
      attempt >= 3 ? (result.deadlift3 ?? 0) : 0,
      0,
    ),
  }))
}

export type AttemptEvent = {
  year: number
  lot: number
  lift: "squat" | "bench" | "deadlift" | "total"
  liftOrder: number
  attempt: 1 | 2 | 3
  weight: number
  result: Result
}

/**
 * Builds a flat list of attempt events from results, including individual lifts and running totals.
 * Suitable for cross-year chronological sorting and record scanning.
 */
export function buildAttemptEvents(
  results: Result[],
  meetsMap: Map<number, MeetPublic>
): AttemptEvent[] {
  const events: AttemptEvent[] = []

  for (const r of results) {
    const meet = meetsMap.get(r.meetId)
    if (!meet) continue
    const year = meet.systemYear ?? 0
    const lot = r.lot ?? 999

    if (r.squat1) events.push({ year, lot, lift: "squat", liftOrder: 0, attempt: 1, weight: r.squat1, result: r })
    if (r.squat2) events.push({ year, lot, lift: "squat", liftOrder: 0, attempt: 2, weight: r.squat2, result: r })
    if (r.squat3) events.push({ year, lot, lift: "squat", liftOrder: 0, attempt: 3, weight: r.squat3, result: r })

    if (r.bench1) events.push({ year, lot, lift: "bench", liftOrder: 1, attempt: 1, weight: r.bench1, result: r })
    if (r.bench2) events.push({ year, lot, lift: "bench", liftOrder: 1, attempt: 2, weight: r.bench2, result: r })
    if (r.bench3) events.push({ year, lot, lift: "bench", liftOrder: 1, attempt: 3, weight: r.bench3, result: r })

    if (r.deadlift1) events.push({ year, lot, lift: "deadlift", liftOrder: 2, attempt: 1, weight: r.deadlift1, result: r })
    if (r.deadlift2) events.push({ year, lot, lift: "deadlift", liftOrder: 2, attempt: 2, weight: r.deadlift2, result: r })
    if (r.deadlift3) events.push({ year, lot, lift: "deadlift", liftOrder: 2, attempt: 3, weight: r.deadlift3, result: r })

    for (const { attempt, weight } of getRunningTotals(r)) {
      if (weight > 0) {
        events.push({ year, lot, lift: "total", liftOrder: 3, attempt, weight, result: r })
      }
    }
  }

  return events
}

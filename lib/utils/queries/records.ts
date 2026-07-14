import { RECORD_DIVISION_OVERRIDE, RECORD_START_YEAR } from "~/lib/constants/constants"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic, UserPublicWithDecorators } from "~/types/users"
import type { Result } from "~/types/results"
import type { RankedDivision } from "~/types/union-types"

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

type RecordEntry = LiftRecord & { vpfId: string }

/**
 * Computes record status (holding/broken) for a specific athlete across all national meets.
 * Returns all records ever set by the athlete with status populated.
 */
export async function fetchAthleteRecordStatus(targetVpfId: string): Promise<LiftRecord[]> {
  const { meets: allMeets, results, athletes } = await getMeetsAndResultsAndAthletes({
    meetType: ["national"],
    legacy: false,
    hidden: false,
    minYear: RECORD_START_YEAR,
  })

  if (allMeets.length === 0) return []

  const usersMap = new Map<string, UserPublic>()
  athletes.forEach(u => usersMap.set(u.vpfId, u))

  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach(m => meetsMap.set(m.meetId, m))

  const events = buildAttemptEvents(results, meetsMap)
  events.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.liftOrder !== b.liftOrder) return a.liftOrder - b.liftOrder
    if (a.attempt !== b.attempt) return a.attempt - b.attempt
    if (a.weight !== b.weight) return a.weight - b.weight
    return a.lot - b.lot
  })

  const groupBest = new Map<string, { weight: number; entry: RecordEntry }>()
  const allRecords: RecordEntry[] = []
  const processed = new Set<string>()

  for (const e of events) {
    const { result, lift, attempt, weight } = e
    if (weight <= 0) continue

    const resultKey = `${result.vpfId}-${lift}-${attempt}-${weight}`
    if (processed.has(resultKey)) continue
    processed.add(resultKey)

    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const dob = usersMap.get(result.vpfId)?.dob ?? null
    const targetDivisions = getTargetDivisions(dob, meet.systemYear)

    for (const div of targetDivisions) {
      const key = `${result.sex}-${div}-${result.weightClass}-${lift}`
      const prev = groupBest.get(key)

      if (weight > (prev?.weight ?? 0)) {
        if (prev) {
          prev.entry.status = "broken"
        }

        const newEntry: RecordEntry = {
          resultId: result.resultId,
          lift,
          attempt,
          recordWeight: weight,
          recordDivision: div,
          status: "holding",
          vpfId: result.vpfId,
        }
        groupBest.set(key, { weight, entry: newEntry })
        allRecords.push(newEntry)
      }
    }
  }

  return allRecords
    .filter(r => r.vpfId === targetVpfId)
    .map(({ vpfId: _, ...rest }) => rest)
}

type FetchRecordsOptions = {
  maxYear?: number | null
  minYear?: number
}

// Internal type that adds lot for tiebreaking during sorting
type RecordCandidate = LiftRecord & { lot: number }

/**
 * Fetches all records up to (and including) a given year.
 * Returns records, meets, and athletes data.
 */
export async function fetchRecordsForYear(
  options: FetchRecordsOptions = {}
): Promise<{
  records: LiftRecord[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
  results: Result[]
}> {
  const { maxYear = null, minYear = RECORD_START_YEAR } = options

  const { meets: allMeets, results, athletes } = await getMeetsAndResultsAndAthletes({
    meetType: ["national"],
    legacy: false,
    hidden: false,
    minYear,
    maxYear: maxYear !== null && !isNaN(maxYear) ? maxYear : undefined,
  })

  if (allMeets.length === 0) {
    return { records: [], meets: [], athletes: [], results: [] }
  }

  const usersMap = new Map<string, UserPublic>()
  athletes.forEach(u => usersMap.set(u.vpfId, u))

  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach(m => meetsMap.set(m.meetId, m))

  type GroupKey = string
  const groupedResults = new Map<GroupKey, RecordCandidate[]>()

  for (const result of results) {
    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const dob = usersMap.get(result.vpfId)?.dob ?? null
    const targetDivisions = getTargetDivisions(dob, meet.systemYear)

    const lot = result.lot ?? 999

    const bestSquat = getBestAttempt(result.squat1, result.squat2, result.squat3)
    const bestBench = getBestAttempt(result.bench1, result.bench2, result.bench3)
    const bestDeadlift = getBestAttempt(result.deadlift1, result.deadlift2, result.deadlift3)

    // Individual lifts
    for (const { lift, best } of [
      { lift: "squat" as const, best: bestSquat },
      { lift: "bench" as const, best: bestBench },
      { lift: "deadlift" as const, best: bestDeadlift },
    ]) {
      if (!best?.weight || best.weight <= 0) continue
      for (const targetDiv of targetDivisions) {
        const key = `${result.sex}-${targetDiv}-${result.weightClass}-${lift}`
        if (!groupedResults.has(key)) groupedResults.set(key, [])
        groupedResults.get(key)!.push({
          resultId: result.resultId,
          lift,
          attempt: best.attempt,
          recordWeight: best.weight,
          recordDivision: targetDiv,
          lot,
        })
      }
    }

    // Running totals after each deadlift attempt
    for (const { attempt, weight } of getRunningTotals(result)) {
      if (!weight || weight <= 0) continue
      for (const targetDiv of targetDivisions) {
        const key = `${result.sex}-${targetDiv}-${result.weightClass}-total`
        if (!groupedResults.has(key)) groupedResults.set(key, [])
        groupedResults.get(key)!.push({
          resultId: result.resultId,
          lift: "total",
          attempt,
          recordWeight: weight,
          recordDivision: targetDiv,
          lot,
        })
      }
    }
  }

  const records: LiftRecord[] = []

  for (const [, groupResults] of groupedResults.entries()) {
    if (groupResults.length === 0) continue

    groupResults.sort((a, b) => {
      if (b.recordWeight !== a.recordWeight) return b.recordWeight - a.recordWeight
      if (a.attempt !== b.attempt) return a.attempt - b.attempt
      return a.lot - b.lot
    })

    const { resultId, lift, attempt, recordWeight, recordDivision } = groupResults[0]
    records.push({ resultId, lift, attempt, recordWeight, recordDivision })
  }

  return {
    records,
    meets: allMeets,
    athletes: Array.from(usersMap.values()),
    results,
  }
}

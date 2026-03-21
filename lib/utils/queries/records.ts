import { RECORD_DIVISION_OVERRIDE, RECORD_START_YEAR } from "~/lib/constants/constants"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
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
  athletes: UserPublic[]
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

    const systemYear = meet.systemYear
    const dob = usersMap.get(result.vpfId)?.dob ?? null
    const originalDiv: RankedDivision = (dob === null || systemYear === null)
      ? "open" : getDivisionFromAge(systemYear - dob)

    const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE
      ? RECORD_DIVISION_OVERRIDE[originalDiv]
      : [originalDiv]) as RankedDivision[]

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
    const bestSquatW = bestSquat?.weight ?? 0
    const bestBenchW = bestBench?.weight ?? 0
    const totalAttempts = [
      { attempt: 1 as const, weight: bestSquatW + bestBenchW + Math.max(result.deadlift1 ?? 0, 0) },
      { attempt: 2 as const, weight: bestSquatW + bestBenchW + Math.max(result.deadlift1 ?? 0, result.deadlift2 ?? 0, 0) },
      { attempt: 3 as const, weight: bestSquatW + bestBenchW + Math.max(result.deadlift1 ?? 0, result.deadlift2 ?? 0, result.deadlift3 ?? 0, 0) },
    ]

    for (const { attempt, weight } of totalAttempts) {
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

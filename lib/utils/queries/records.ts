import { db } from "~/lib/external/drizzle/drizzle"
import { meets, meetResults, users } from "~/lib/external/drizzle/migrations/schema"
import { userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { RECORD_DIVISION_OVERRIDE, RECORD_START_YEAR } from "~/lib/constants/constants"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { RankedDivision } from "~/types/union-types"
import { eq, and, inArray, gte, lte } from "drizzle-orm"

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
}> {
  const { maxYear = null, minYear = RECORD_START_YEAR } = options

  // Build meet filter
  const meetConditions = [
    eq(meets.type, "national"),
    eq(meets.legacy, false),
    eq(meets.hidden, false),
    gte(meets.systemYear, minYear),
  ]
  
  if (maxYear !== null && !isNaN(maxYear)) {
    meetConditions.push(lte(meets.systemYear, maxYear))
  }

  // Query meets
  const allMeets = await db
    .select()
    .from(meets)
    .where(and(...meetConditions))

  if (allMeets.length === 0) {
    return {
      records: [],
      meets: [],
      athletes: [],
    }
  }

  const meetIds = allMeets.map(m => m.meetId)

  // Query meet results
  const resultsRaw = await db
    .select()
    .from(meetResults)
    .where(inArray(meetResults.meetId, meetIds))

  // Get all unique vpfIds from results
  const allVpfIds = new Set<string>()
  resultsRaw.forEach(r => allVpfIds.add(r.vpfId))

  // Query users
  const allUsers = await db
    .select(userPublicSelect)
    .from(users)
    .where(inArray(users.vpfId, Array.from(allVpfIds)))

  const usersMap = new Map<string, UserPublic>()
  allUsers.forEach(u => usersMap.set(u.vpfId, u))

  // Create a map of meetId -> meet
  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach(m => meetsMap.set(m.meetId, m))

  // Combine and transform all results
  const results = addMetadataToMeetResults(resultsRaw)

  // Group results by sex, division, weight class, and lift
  // Format: "sex-division-weightClass-lift"
  type GroupKey = string

  const groupedResults = new Map<GroupKey, LiftRecord[]>()

  // Process results
  for (const result of results) {
    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const systemYear = meet.systemYear
    const dob = usersMap.get(result.vpfId)?.dob ?? null
    
    // Determine original division
    const originalDiv: RankedDivision = (dob === null || systemYear === null)
      ? "open" : getDivisionFromAge(systemYear - dob)

    const lifts = [
      { lift: "squat" as const, best: getBestAttempt(result.squat1, result.squat2, result.squat3) },
      { lift: "bench" as const, best: getBestAttempt(result.bench1, result.bench2, result.bench3) },
      { lift: "deadlift" as const, best: getBestAttempt(result.deadlift1, result.deadlift2, result.deadlift3) },
      { lift: "total" as const, best: { weight: result.total } },
    ]

    for (const { lift, best } of lifts) {
      if (!best?.weight || best?.weight <= 0) continue

      // Get target divisions with promotion
      const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE 
        ? RECORD_DIVISION_OVERRIDE[originalDiv]
        : [originalDiv]) as RankedDivision[]

      for (const targetDiv of targetDivisions) {
        const key = `${result.sex}-${targetDiv}-${result.weightClass}-${lift}`
        
        if (!groupedResults.has(key)) {
          groupedResults.set(key, [])
        }

        groupedResults.get(key)!.push({
          ...result,
          recordWeight: best.weight,
          attempt: "attempt" in best ? best.attempt : undefined,
          lift,
          recordDivision: targetDiv
        })
      }
    }
  }

  // Find top record for each group
  const records: LiftRecord[] = []

  for (const [, groupResults] of groupedResults.entries()) {
    if (groupResults.length === 0) continue

    // Sort by weight (desc), then by attempt (asc), then by lot (asc) for tie-breaking
    groupResults.sort((a, b) => {
      if (b.recordWeight !== a.recordWeight) return b.recordWeight - a.recordWeight
      // Tie-breaking: smaller attempt number wins
      const attemptA = a.attempt ?? 999
      const attemptB = b.attempt ?? 999
      if (attemptA !== attemptB) return attemptA - attemptB
      // Further tie-breaking: smaller lot wins
      const lotA = a.lot ?? 999
      const lotB = b.lot ?? 999
      return lotA - lotB
    })

    const topResult = groupResults[0]
    records.push({ ...topResult })
  }

  return {
    records,
    meets: allMeets,
    athletes: Array.from(usersMap.values()),
  }
}

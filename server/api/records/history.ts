import { db } from "~/lib/external/drizzle/drizzle"
import { meets, meetResults, users } from "~/lib/external/drizzle/migrations/schema"
import { userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import { 
  RECORD_DIVISION_OVERRIDE, 
  RECORD_START_YEAR
} from "~/lib/constants/constants"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { Division } from "~/types/union-types"
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm"

type HistoryResponse = {
  records: LiftRecord[]
  meet: MeetPublic | null
  athletes: UserPublic[]
}

function getDivisionFromAge(age: number): Division {
  if (age >= 14 && age <= 18) return "subjr"
  if (age >= 19 && age <= 23) return "jr"
  if (age >= 40 && age <= 49) return "mas1"
  if (age >= 50 && age <= 59) return "mas2"
  if (age >= 60 && age <= 69) return "mas3"
  if (age >= 70) return "mas4"
  return "open"
}

function getBestAttempt(
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

// Fetch records from a specific year (reusing logic from records/index.ts)
async function fetchRecordsForYear(year: number): Promise<LiftRecord[]> {
  const meetConditions = [
    eq(meets.type, "national"),
    eq(meets.legacy, false),
    eq(meets.hidden, false),
    gte(meets.systemYear, RECORD_START_YEAR),
    lte(meets.systemYear, year),
  ]

  const allMeets = await db
    .select()
    .from(meets)
    .where(and(...meetConditions))

  if (allMeets.length === 0) {
    return []
  }

  const meetIds = allMeets.map(m => m.meetId)
  const resultsRaw = await db
    .select()
    .from(meetResults)
    .where(inArray(meetResults.meetId, meetIds))

  const allVpfIds = new Set<string>()
  resultsRaw.forEach(r => allVpfIds.add(r.vpfId))

  const allUsers = await db
    .select(userPublicSelect)
    .from(users)
    .where(inArray(users.vpfId, Array.from(allVpfIds)))

  const usersMap = new Map<string, UserPublic>()
  allUsers.forEach(u => usersMap.set(u.vpfId, u))

  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach(m => meetsMap.set(m.meetId, m))

  const results = addMetadataToMeetResults(resultsRaw)

  type GroupKey = string
  const groupedResults = new Map<GroupKey, LiftRecord[]>()

  for (const result of results) {
    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const systemYear = meet.systemYear
    const dob = usersMap.get(result.vpfId)?.dob ?? null
    
    const originalDiv: Division = (dob === null || systemYear === null)
      ? "open" : getDivisionFromAge(systemYear - dob)

    const lifts = [
      { lift: "squat" as const, best: getBestAttempt(result.squat1, result.squat2, result.squat3) },
      { lift: "bench" as const, best: getBestAttempt(result.bench1, result.bench2, result.bench3) },
      { lift: "deadlift" as const, best: getBestAttempt(result.deadlift1, result.deadlift2, result.deadlift3) },
      { lift: "total" as const, best: { weight: result.total } },
    ]

    for (const { lift, best } of lifts) {
      if (!best?.weight || best?.weight <= 0) continue

      const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE 
        ? RECORD_DIVISION_OVERRIDE[originalDiv as keyof typeof RECORD_DIVISION_OVERRIDE]
        : [originalDiv]) as Division[]

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

  const records: LiftRecord[] = []

  for (const [, groupResults] of groupedResults.entries()) {
    if (groupResults.length === 0) continue

    groupResults.sort((a, b) => {
      if (b.recordWeight !== a.recordWeight) return b.recordWeight - a.recordWeight
      const attemptA = a.attempt ?? 999
      const attemptB = b.attempt ?? 999
      if (attemptA !== attemptB) return attemptA - attemptB
      const lotA = a.lot ?? 999
      const lotB = b.lot ?? 999
      return lotA - lotB
    })

    const topResult = groupResults[0]
    records.push({ ...topResult })
  }

  return records
}

export default defineEventHandler(async (event): Promise<ApiResponse<HistoryResponse>> => {
  try {
    // Get year query parameter
    const query = getQuery(event)
    let year = query.year ? parseInt(query.year as string, 10) : null

    const maxYearResult = await db
      .select({ maxYear: sql<number>`MAX(${meets.systemYear})` })
      .from(meets)
      .where(and(
        eq(meets.type, "national"),
        eq(meets.legacy, false),
        eq(meets.hidden, false)
      ))

    const maxYear = maxYearResult[0].maxYear

    if (year === null || year > maxYear) {
      year = maxYear
    }
      
    if (year === null) {
      return {
        success: true,
        data: {
          records: [],
          meet: null,
          athletes: [],
        },
        message: {
          en: "No meets found",
          vi: "Không tìm thấy meet nào",
        },
      }
    }

    // Fetch records of year-1
    const previousYearRecords = await fetchRecordsForYear(year - 1)

    // Create a map of previous records for quick lookup
    // Key: "sex-division-weightClass-lift" -> record weight
    const previousRecordsMap = new Map<string, number>()
    for (const record of previousYearRecords) {
      const key = `${record.sex}-${record.recordDivision}-${record.weightClass}-${record.lift}`
      const currentBest = previousRecordsMap.get(key) ?? 0
      if (record.recordWeight > currentBest) {
        previousRecordsMap.set(key, record.recordWeight)
      }
    }

    // Fetch national meet of year (only one exists guaranteed)
    const nationalMeet = await db
      .select()
      .from(meets)
      .where(and(
        eq(meets.type, "national"),
        eq(meets.systemYear, year),
        eq(meets.legacy, false),
        eq(meets.hidden, false)
      ))
      .limit(1)

    if (nationalMeet.length === 0) {
      return {
        success: true,
        data: {
          records: [],
          meet: null,
          athletes: [],
        },
        message: {
          en: "No national meet found for the specified year",
          vi: "Không tìm thấy giải quốc gia cho năm được chỉ định",
        },
      }
    }

    const meet = nationalMeet[0]
    const meetId = meet.meetId

    // Fetch meet results for this meet
    const resultsRaw = await db
      .select()
      .from(meetResults)
      .where(eq(meetResults.meetId, meetId))

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

    // Combine and transform all results
    const results = addMetadataToMeetResults(resultsRaw)

    // Sort results by lot (low lot -> high lot)
    results.sort((a, b) => {
      const lotA = a.lot ?? 999
      const lotB = b.lot ?? 999
      return lotA - lotB
    })

    // Process results: iterate squat -> deadlift, lift1 -> lift3, low lot -> high lot
    const newRecords: LiftRecord[] = []
    
    // Track group keys (current best in processing): "sex-division-weightClass-lift" -> weight
    const groupKeys = new Map<string, number>()
    
    // Track processed results to skip duplicates: "vpfId-meetId-lift-attempt-weight"
    const processedResults = new Set<string>()

    const systemYear = meet.systemYear

    for (const result of results) {
      const dob = usersMap.get(result.vpfId)?.dob ?? null
      const originalDiv: Division = (dob === null || systemYear === null)
        ? "open" : getDivisionFromAge(systemYear - dob)

      // Get target divisions with promotion
      const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE 
        ? RECORD_DIVISION_OVERRIDE[originalDiv as keyof typeof RECORD_DIVISION_OVERRIDE]
        : [originalDiv]) as Division[]

      // Process each lift type
      const liftTypes = [
        { 
          lift: "squat" as const, 
          attempts: [
            { weight: result.squat1, attempt: 1 as const },
            { weight: result.squat2, attempt: 2 as const },
            { weight: result.squat3, attempt: 3 as const },
          ]
        },
        { 
          lift: "bench" as const, 
          attempts: [
            { weight: result.bench1, attempt: 1 as const },
            { weight: result.bench2, attempt: 2 as const },
            { weight: result.bench3, attempt: 3 as const },
          ]
        },
        { 
          lift: "deadlift" as const, 
          attempts: [
            { weight: result.deadlift1, attempt: 1 as const },
            { weight: result.deadlift2, attempt: 2 as const },
            { weight: result.deadlift3, attempt: 3 as const },
          ]
        },
      ]

      for (const { lift, attempts } of liftTypes) {
        // Process each attempt (lift1 -> lift3)
        for (const { weight, attempt } of attempts) {
          if (weight === null || weight <= 0) continue

          // Check if same result (skip later one)
          const resultKey = `${result.vpfId}-${result.meetId}-${lift}-${attempt}-${weight}`
          if (processedResults.has(resultKey)) continue
          processedResults.add(resultKey)

          // For each overridable division
          for (const targetDiv of targetDivisions) {
            const groupKey = `${result.sex}-${targetDiv}-${result.weightClass}-${lift}`
            const previousRecord = previousRecordsMap.get(groupKey) ?? 0
            // Initialize group key with previous record if not set
            if (!groupKeys.has(groupKey)) {
              groupKeys.set(groupKey, previousRecord)
            }
            const currentGroupBest = groupKeys.get(groupKey)!

            // If current lift > record of overridable division
            if (weight > previousRecord) {
              // Add to records array and update group key
              newRecords.push({
                ...result,
                recordWeight: weight,
                attempt,
                lift,
                recordDivision: targetDiv
              })
              
              if (weight > currentGroupBest) {
                groupKeys.set(groupKey, weight)
              }
            }
            // If current lift > group key (current best in processing)
            else if (weight > currentGroupBest) {
              // Add to record array and update group key
              newRecords.push({
                ...result,
                recordWeight: weight,
                attempt,
                lift,
                recordDivision: targetDiv
              })
              
              groupKeys.set(groupKey, weight)
            }
          }
        }
      }

      // Process total (only one value, not multiple attempts)
      if (result.total !== null && result.total > 0) {
        const resultKey = `${result.vpfId}-${result.meetId}-total-0-${result.total}`
        if (!processedResults.has(resultKey)) {
          processedResults.add(resultKey)

          for (const targetDiv of targetDivisions) {
            const groupKey = `${result.sex}-${targetDiv}-${result.weightClass}-total`
            const previousRecord = previousRecordsMap.get(groupKey) ?? 0
            // Initialize group key with previous record if not set
            if (!groupKeys.has(groupKey)) {
              groupKeys.set(groupKey, previousRecord)
            }
            const currentGroupBest = groupKeys.get(groupKey)!

            if (result.total > previousRecord) {
              newRecords.push({
                ...result,
                recordWeight: result.total,
                lift: "total",
                recordDivision: targetDiv
              })
              
              if (result.total > currentGroupBest) {
                groupKeys.set(groupKey, result.total)
              }
            } else if (result.total > currentGroupBest) {
              newRecords.push({
                ...result,
                recordWeight: result.total,
                lift: "total",
                recordDivision: targetDiv
              })
              
              groupKeys.set(groupKey, result.total)
            }
          }
        }
      }
    }

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")
    setResponseStatus(event, 200)

    return {
      success: true,
      data: {
        records: newRecords,
        meet: meet as MeetPublic,
        athletes: Array.from(usersMap.values()),
      },
      message: {
        en: "Record history retrieved successfully",
        vi: "Lấy lịch sử kỷ lục thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching record history", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: {
        records: [],
        meet: null,
        athletes: [],
      },
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

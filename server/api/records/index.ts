import { db } from "~/lib/external/drizzle/drizzle"
import { meets, meetResults, legacyMeetResults, users } from "~/lib/external/drizzle/migrations/schema"
import { userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, RECORD_DIVISION_OVERRIDE, RECORD_START_YEAR } from "~/lib/constants/constants"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { ApiResponse } from "~/types/api"
import type { Record } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { Result } from "~/types/results"
import type { Sex, Division } from "~/types/union-types"
import { eq, lte, gte, and, inArray } from "drizzle-orm"

type RecordsResponse = {
  records: Record[]
  meet: MeetPublic[]
  athletes: UserPublic[]
  results: Result[]
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

export default defineEventHandler(async (event): Promise<ApiResponse<RecordsResponse>> => {
  try {
    // Get year query parameter
    const query = getQuery(event)
    const year = query.year ? parseInt(query.year as string, 10) : null

    // Build meet filter
    const meetConditions = [
      eq(meets.type, "national"),
      eq(meets.hidden, false),
      gte(meets.systemYear, RECORD_START_YEAR),
    ]
    if (year !== null && !isNaN(year)) {
      meetConditions.push(lte(meets.systemYear, year))
    }

    // Query meets
    const allMeets = await db
      .select()
      .from(meets)
      .where(and(...meetConditions))

    if (allMeets.length === 0) {
      return {
        success: true,
        data: {
          records: [],
          meet: [],
          athletes: [],
          results: [],
        },
        message: {
          en: "No meets found",
          vi: "Không tìm thấy meet nào",
        },
      }
    }

    const meetIds = allMeets.map(m => m.meetId)

    // Query modern meet results
    const modernResults = await db
      .select()
      .from(meetResults)
      .where(inArray(meetResults.meetId, meetIds))

    // Query legacy meet results
    const legacyResults = await db
      .select()
      .from(legacyMeetResults)
      .where(inArray(legacyMeetResults.meetId, meetIds))

    // Get all unique vpfIds from results
    const allVpfIds = new Set<string>()
    modernResults.forEach(r => allVpfIds.add(r.vpfId))
    legacyResults.forEach(r => allVpfIds.add(r.vpfId))

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
    const allRawResults = [...modernResults, ...legacyResults]
    const transformedResults = addMetadataToMeetResults(allRawResults)

    // Group results by sex, division, weight class, and lift
    // Format: "sex-division-weightClass-lift"
    type GroupKey = string
    type GroupResult = {
      vpfId: string
      meetId: number
      weight: number
      attempt?: 1 | 2 | 3
      systemYear: number | null
      dob: number | null
    }

    const groupedResults = new Map<GroupKey, GroupResult[]>()

    // Process modern results
    for (const result of modernResults) {
      const meet = meetsMap.get(result.meetId)
      if (!meet) continue

      const systemYear = meet.systemYear
      const dob = usersMap.get(result.vpfId)?.dob ?? null
      
      // Determine original division
      let originalDiv: Division
      if (dob === null || systemYear === null) {
        originalDiv = (result.division === "mas1" || result.division === "mas2" || 
                       result.division === "mas3" || result.division === "mas4")
          ? result.division
          : "open"
      } else {
        const age = systemYear - dob
        originalDiv = getDivisionFromAge(age)
      }

      // Calculate best lifts
      const bestSquat = getBestAttempt(result.squat1, result.squat2, result.squat3)
      const bestBench = getBestAttempt(result.bench1, result.bench2, result.bench3)
      const bestDeadlift = getBestAttempt(result.deadlift1, result.deadlift2, result.deadlift3)

      // Calculate total
      const total = [bestSquat, bestBench, bestDeadlift]
        .filter(b => b !== null)
        .reduce((sum, b) => sum + (b?.weight ?? 0), 0)

      // Process each lift
      const lifts: Array<{ lift: "squat" | "bench" | "deadlift" | "total"; best: { weight: number; attempt?: 1 | 2 | 3 } | null }> = [
        { lift: "squat", best: bestSquat },
        { lift: "bench", best: bestBench },
        { lift: "deadlift", best: bestDeadlift },
        { lift: "total", best: total > 0 ? { weight: total } : null },
      ]

      for (const { lift, best } of lifts) {
        if (!best || best.weight <= 0) continue

        // Get target divisions with promotion
        const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE 
          ? RECORD_DIVISION_OVERRIDE[originalDiv as keyof typeof RECORD_DIVISION_OVERRIDE]
          : [originalDiv]) as Division[]

        for (const targetDiv of targetDivisions) {
          const key = `${result.sex}-${targetDiv}-${result.weightClass}-${lift}`
          
          if (!groupedResults.has(key)) {
            groupedResults.set(key, [])
          }

          groupedResults.get(key)!.push({
            vpfId: result.vpfId,
            meetId: result.meetId,
            weight: best.weight,
            attempt: best.attempt,
            systemYear,
            dob,
          })
        }
      }
    }

    // Process legacy results
    for (const result of legacyResults) {
      const meet = meetsMap.get(result.meetId)
      if (!meet) continue

      const systemYear = meet.systemYear
      const dob = usersMap.get(result.vpfId)?.dob ?? null
      
      // Determine original division
      let originalDiv: Division
      if (dob === null || systemYear === null) {
        originalDiv = (result.division === "mas1" || result.division === "mas2" || 
                       result.division === "mas3" || result.division === "mas4")
          ? result.division
          : "open"
      } else {
        const age = systemYear - dob
        originalDiv = getDivisionFromAge(age)
      }

      // Legacy results already have best lifts
      const bestSquat = result.bestSquat && result.bestSquat > 0 
        ? { weight: result.bestSquat, attempt: undefined as 1 | 2 | 3 | undefined }
        : null
      const bestBench = result.bestBench && result.bestBench > 0 
        ? { weight: result.bestBench, attempt: undefined as 1 | 2 | 3 | undefined }
        : null
      const bestDeadlift = result.bestDeadlift && result.bestDeadlift > 0 
        ? { weight: result.bestDeadlift, attempt: undefined as 1 | 2 | 3 | undefined }
        : null

      // Calculate total
      const total = [bestSquat, bestBench, bestDeadlift]
        .filter(b => b !== null)
        .reduce((sum, b) => sum + (b?.weight ?? 0), 0)

      // Process each lift
      const lifts: Array<{ lift: "squat" | "bench" | "deadlift" | "total"; best: { weight: number; attempt?: 1 | 2 | 3 } | null }> = [
        { lift: "squat", best: bestSquat },
        { lift: "bench", best: bestBench },
        { lift: "deadlift", best: bestDeadlift },
        { lift: "total", best: total > 0 ? { weight: total } : null },
      ]

      for (const { lift, best } of lifts) {
        if (!best || best.weight <= 0) continue

        // Get target divisions with promotion
        const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE 
          ? RECORD_DIVISION_OVERRIDE[originalDiv as keyof typeof RECORD_DIVISION_OVERRIDE]
          : [originalDiv]) as Division[]

        for (const targetDiv of targetDivisions) {
          const key = `${result.sex}-${targetDiv}-${result.weightClass}-${lift}`
          
          if (!groupedResults.has(key)) {
            groupedResults.set(key, [])
          }

          groupedResults.get(key)!.push({
            vpfId: result.vpfId,
            meetId: result.meetId,
            weight: best.weight,
            attempt: best.attempt,
            systemYear,
            dob,
          })
        }
      }
    }

    // Find top record for each group
    const records: Record[] = []
    const divisions: Division[] = ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4"]
    const sexes: Sex[] = ["male", "female"]
    const liftTypes: Array<"squat" | "bench" | "deadlift" | "total"> = ["squat", "bench", "deadlift", "total"]

    // Process each combination to find records and fill empty weight classes
    for (const sex of sexes) {
      const sexWeightClasses = sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE
      
      for (const division of divisions) {
        for (const lift of liftTypes) {
          for (const weightClass of sexWeightClasses) {
            const key = `${sex}-${division}-${weightClass}-${lift}`
            const groupResults = groupedResults.get(key) || []

            if (groupResults.length > 0) {
              // Sort by weight (desc), then by systemYear (desc) for tie-breaking
              groupResults.sort((a, b) => {
                if (b.weight !== a.weight) return b.weight - a.weight
                return (b.systemYear ?? 0) - (a.systemYear ?? 0)
              })

              const topResult = groupResults[0]
              
              if (lift === "total") {
                // For total, we need to create a record without vpfId/meetId per type definition
                // But we'll include them for consistency - this may need type adjustment
                records.push({
                  lift: "total",
                  weight: topResult.weight,
                } as Record)
              } else {
                // For individual lifts, we need an attempt number
                // If we don't have it (legacy), use 1 as default
                records.push({
                  vpfId: topResult.vpfId,
                  meetId: topResult.meetId,
                  lift: lift as "squat" | "bench" | "deadlift",
                  attempt: topResult.attempt ?? 1,
                  weight: topResult.weight,
                })
              }
            } else {
              // Fill empty weight class with null record
              if (lift === "total") {
                records.push({
                  lift: "total",
                  weight: null,
                })
              } else {
                // For individual lifts with null weight, we still need vpfId/meetId
                // Use a placeholder - this represents an empty record
                records.push({
                  vpfId: "" as UserPublic["vpfId"],
                  meetId: 0 as MeetPublic["meetId"],
                  lift: lift as "squat" | "bench" | "deadlift",
                  attempt: 1,
                  weight: null,
                })
              }
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
        records,
        meet: allMeets,
        athletes: Array.from(usersMap.values()),
        results: transformedResults,
      },
      message: {
        en: "Records retrieved successfully",
        vi: "Lấy thông tin kỷ lục thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching records", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

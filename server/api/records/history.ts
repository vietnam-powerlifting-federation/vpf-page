import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { RECORD_DIVISION_OVERRIDE } from "~/lib/constants/constants"
import { fetchRecordsForYear, getDivisionFromAge } from "~/lib/utils/queries/records"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { RankedDivision } from "~/types/union-types"
import { eq, and, sql } from "drizzle-orm"
import type { Result } from "~/types/results"

type HistoryResponse = {
  records: LiftRecord[]
  meet: MeetPublic | null
  athletes: UserPublic[]
}

type AttemptEvent = {
  lot: number
  lift: "squat" | "bench" | "deadlift"
  liftOrder: number
  attempt: 1 | 2 | 3
  weight: number
  result: Result
}

export default defineEventHandler(async (event): Promise<ApiResponse<HistoryResponse>> => {
  try {
    const query = getQuery(event)
    let year = query.year ? parseInt(query.year as string, 10) : null

    const [{ maxYear }] = await db
      .select({ maxYear: sql<number>`MAX(${meets.systemYear})` })
      .from(meets)
      .where(and(
        eq(meets.type, "national"),
        eq(meets.legacy, false),
        eq(meets.hidden, false)
      ))

    if (year === null || year > maxYear) year = maxYear

    const { records: previousYearRecords } =
      await fetchRecordsForYear({ maxYear: year - 1 })

    const previousRecordsMap = new Map<string, number>()
    for (const r of previousYearRecords) {
      previousRecordsMap.set(
        `${r.sex}-${r.recordDivision}-${r.weightClass}-${r.lift}`,
        r.recordWeight
      )
    }

    // Query meet, results, and athletes in a single optimized query
    const { meets: returnedMeets, results, athletes } = await getMeetsAndResultsAndAthletes({
      meetType: ["national"],
      legacy: false,
      hidden: false,
      minYear: year,
      maxYear: year,
    })

    const meet = returnedMeets[0] || null

    if (!meet) {
      return {
        success: true,
        data: { records: [], meet: null, athletes: [] },
        message: {
          en: "No national meet found",
          vi: "Không tìm thấy giải quốc gia",
        },
      }
    }

    const usersMap = new Map<string, UserPublic>()
    athletes.forEach(u => usersMap.set(u.vpfId, u))

    // ---------- BUILD ATTEMPT TIMELINE ----------

    const attemptEvents: AttemptEvent[] = []

    for (const r of results) {
      const lot = r.lot ?? 999

      if (r.squat1) attemptEvents.push({ lot, lift: "squat", liftOrder: 0, attempt: 1, weight: r.squat1, result: r })
      if (r.squat2) attemptEvents.push({ lot, lift: "squat", liftOrder: 0, attempt: 2, weight: r.squat2, result: r })
      if (r.squat3) attemptEvents.push({ lot, lift: "squat", liftOrder: 0, attempt: 3, weight: r.squat3, result: r })

      if (r.bench1) attemptEvents.push({ lot, lift: "bench", liftOrder: 1, attempt: 1, weight: r.bench1, result: r })
      if (r.bench2) attemptEvents.push({ lot, lift: "bench", liftOrder: 1, attempt: 2, weight: r.bench2, result: r })
      if (r.bench3) attemptEvents.push({ lot, lift: "bench", liftOrder: 1, attempt: 3, weight: r.bench3, result: r })

      if (r.deadlift1) attemptEvents.push({ lot, lift: "deadlift", liftOrder: 2, attempt: 1, weight: r.deadlift1, result: r })
      if (r.deadlift2) attemptEvents.push({ lot, lift: "deadlift", liftOrder: 2, attempt: 2, weight: r.deadlift2, result: r })
      if (r.deadlift3) attemptEvents.push({ lot, lift: "deadlift", liftOrder: 2, attempt: 3, weight: r.deadlift3, result: r })
    }

    attemptEvents.sort((a, b) => {
      if (a.liftOrder !== b.liftOrder) return a.liftOrder - b.liftOrder
      if (a.attempt !== b.attempt) return a.attempt - b.attempt
      if (a.weight !== b.weight) return a.weight - b.weight
      return a.lot - b.lot
    })

    // ---------- RECORD PROCESSING ----------

    const newRecords: LiftRecord[] = []
    const groupBest = new Map<string, number>()
    const processed = new Set<string>()
    const systemYear = meet.systemYear

    for (const e of attemptEvents) {
      const { result, lift, attempt, weight } = e
      if (weight <= 0) continue

      const resultKey = `${result.vpfId}-${lift}-${attempt}-${weight}`
      if (processed.has(resultKey)) continue
      processed.add(resultKey)

      const dob = usersMap.get(result.vpfId)?.dob ?? null
      const originalDiv: RankedDivision =
        dob === null ? "open" : getDivisionFromAge(systemYear - dob)

      const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE
        ? RECORD_DIVISION_OVERRIDE[originalDiv]
        : [originalDiv]) as RankedDivision[]

      for (const div of targetDivisions) {
        const key = `${result.sex}-${div}-${result.weightClass}-${lift}`
        const prev = previousRecordsMap.get(key) ?? 0
        const best = groupBest.get(key) ?? prev

        if (weight > best) {
          newRecords.push({
            ...result,
            lift,
            attempt,
            recordWeight: weight,
            recordDivision: div,
          })
          groupBest.set(key, weight)
        }
      }
    }

    // ---------- TOTALS (LAST) ----------

    for (const r of results) {
      if (!r.total || r.total <= 0) continue

      const dob = usersMap.get(r.vpfId)?.dob ?? null
      const originalDiv: RankedDivision =
        dob === null ? "open" : getDivisionFromAge(systemYear - dob)

      const targetDivisions = (originalDiv in RECORD_DIVISION_OVERRIDE
        ? RECORD_DIVISION_OVERRIDE[originalDiv]
        : [originalDiv]) as RankedDivision[]

      for (const div of targetDivisions) {
        const key = `${r.sex}-${div}-${r.weightClass}-total`
        const prev = previousRecordsMap.get(key) ?? 0
        const best = groupBest.get(key) ?? prev

        if (r.total > best) {
          newRecords.push({
            ...r,
            lift: "total",
            recordWeight: r.total,
            recordDivision: div,
          })
          groupBest.set(key, r.total)
        }
      }
    }

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")

    return {
      success: true,
      data: {
        records: newRecords,
        meet: meet as MeetPublic,
        athletes: [...usersMap.values()],
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
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { RECORD_DIVISION_OVERRIDE } from "~/lib/constants/constants"
import { fetchRecordsForYear, getDivisionFromAge, buildAttemptEvents } from "~/lib/utils/queries/records"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"
import type { RankedDivision } from "~/types/union-types"
import { eq, and, sql } from "drizzle-orm"
import type { Result } from "~/types/results"
import { ok, fail } from "~/server/utils/api-response"

type HistoryResponse = {
  records: LiftRecord[]
  meet: MeetPublic | null
  athletes: UserPublic[]
  results: Result[]
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

    const { records: previousYearRecords, results: previousYearResults } =
      await fetchRecordsForYear({ maxYear: year - 1 })

    const previousResultsById = new Map(previousYearResults.map(r => [r.resultId, r]))

    const previousRecordsMap = new Map<string, number>()
    for (const rec of previousYearRecords) {
      const result = previousResultsById.get(rec.resultId)
      if (!result) continue
      previousRecordsMap.set(
        `${result.sex}-${rec.recordDivision}-${result.weightClass}-${rec.lift}`,
        rec.recordWeight
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
      return ok(
        { records: [], meet: null, athletes: [] },
        { en: "No national meet found", vi: "Không tìm thấy giải quốc gia" },
      )
    }

    const usersMap = new Map<string, UserPublic>()
    athletes.forEach(u => usersMap.set(u.vpfId, u))

    // ---------- BUILD ATTEMPT TIMELINE ----------

    const meetsMap = new Map([[meet.meetId, meet]])
    const attemptEvents = buildAttemptEvents(results, meetsMap)
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
            resultId: result.resultId,
            lift,
            attempt,
            recordWeight: weight,
            recordDivision: div,
          })
          groupBest.set(key, weight)
        }
      }
    }

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")

    return ok(
      {
        records: newRecords,
        meet: meet as MeetPublic,
        athletes: [...usersMap.values()],
        results,
      },
      { en: "Record history retrieved successfully", vi: "Lấy lịch sử kỷ lục thành công" },
    )
  } catch (error) {
    logger.error("Error fetching record history", { error })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<HistoryResponse>
  }
})

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { DISQUALIFIED } from "~/lib/constants/constants"

const MEET_NOT_FOUND = { en: "Meet not found", vi: "Không tìm thấy meet" }

type MeetDetailsResponse = {
  meet: MeetPublic
  results: ResultWithPlacements[]
  athletes: UserPublicWithDecorators[]
}

type ResultWithPlacements = Result & {
  squatPlacement: number
  benchPlacement: number
  deadliftPlacement: number
}

// Calculate placements for individual lifts within a group
function calculateLiftPlacements(
  results: Result[],
  lift: "bestSquat" | "bestBench" | "bestDeadlift"
): Map<string, number> {
  const placements = new Map<string, number>()
  
  // Filter out disqualified results and sort by lift weight (descending), then bodyweight (ascending)
  const validResults = results
    .filter(r => r.placement !== DISQUALIFIED && r[lift] !== null && r[lift]! > 0)
    .sort((a, b) => {
      const aWeight = a[lift] ?? 0
      const bWeight = b[lift] ?? 0
      if (aWeight !== bWeight) {
        return bWeight - aWeight
      }
      // If weights are equal, lighter bodyweight wins
      const aBodyWeight = a.bodyWeight ?? Infinity
      const bBodyWeight = b.bodyWeight ?? Infinity
      return aBodyWeight - bBodyWeight
    })
  
  let placement = 1
  for (const result of validResults) {
    const key = `${result.meetId}-${result.vpfId}`
    placements.set(key, placement++)
  }
  
  return placements
}

/**
 * Cached on the handler rather than by a `/api/meets/**` route rule.
 *
 * A route rule over that prefix would also cover every admin-only read beneath
 * it — the entry roster, the ban list, `?includeHidden=true` — and the cache key
 * is the URL alone, so one admin's response would be replayed to whoever asked
 * for the same path. This endpoint is public-only, so caching it here is safe and
 * cannot reach anything else.
 */
export default defineCachedEventHandler(async (event): Promise<ApiResponse<MeetDetailsResponse>> => {
  try {
    const identifier = getRouterParam(event, "id")
    
    if (!identifier) {
      return fail(event, 400, {
        en: "Meet identifier is required",
        vi: "Định danh meet là bắt buộc",
      })
    }

    let meetId: number
    let foundMeet: MeetPublic | null = null

    // Check if identifier is a number (ID) or string (slug)
    const meetIdNum = parseInt(identifier, 10)
    if (!isNaN(meetIdNum) && String(meetIdNum) === identifier) {
      // It's a numeric ID
      meetId = meetIdNum
    } else {
      // It's a slug, find the meet by slug first
      const meetBySlug = await db
        .select()
        .from(meets)
        .where(eq(meets.meetSlug, identifier))
        .limit(1)

      if (!meetBySlug || meetBySlug.length === 0) {
        return fail(event, 404, MEET_NOT_FOUND)
      }

      meetId = meetBySlug[0].meetId
      foundMeet = meetBySlug[0]
    }

    // Query meet, results, and athletes
    const { meets: returnedMeets, results: transformedResults, athletes: publicAthletes } = await getMeetsAndResultsAndAthletes({
      meetIds: [meetId],
    })

    const meet = foundMeet || returnedMeets[0] || null

    if (!meet) {
      return fail(event, 404, MEET_NOT_FOUND)
    }

    // Group results by sex, division, and weight class for lift placement calculation
    const groupedResults = new Map<string, Result[]>()
    
    for (const result of transformedResults) {
      const key = `${result.sex}-${result.division}-${result.weightClass}`
      if (!groupedResults.has(key)) {
        groupedResults.set(key, [])
      }
      groupedResults.get(key)!.push(result)
    }

    // Calculate placements for each lift within each group
    const squatPlacements = new Map<string, number>()
    const benchPlacements = new Map<string, number>()
    const deadliftPlacements = new Map<string, number>()

    for (const group of groupedResults.values()) {
      const groupSquatPlacements = calculateLiftPlacements(group, "bestSquat")
      const groupBenchPlacements = calculateLiftPlacements(group, "bestBench")
      const groupDeadliftPlacements = calculateLiftPlacements(group, "bestDeadlift")

      for (const [key, placement] of groupSquatPlacements.entries()) {
        squatPlacements.set(key, placement)
      }
      for (const [key, placement] of groupBenchPlacements.entries()) {
        benchPlacements.set(key, placement)
      }
      for (const [key, placement] of groupDeadliftPlacements.entries()) {
        deadliftPlacements.set(key, placement)
      }
    }

    // Add lift placements to results
    const resultsWithPlacements: ResultWithPlacements[] = transformedResults.map(result => {
      const key = `${result.meetId}-${result.vpfId}`
      return {
        ...result,
        squatPlacement: squatPlacements.get(key) ?? DISQUALIFIED,
        benchPlacement: benchPlacements.get(key) ?? DISQUALIFIED,
        deadliftPlacement: deadliftPlacements.get(key) ?? DISQUALIFIED,
      }
    })

    return ok(
      {
        meet,
        results: resultsWithPlacements,
        athletes: publicAthletes,
      },
      {
        en: "Meet details retrieved successfully",
        vi: "Lấy thông tin meet thành công",
      },
    )
  } catch (error) {
    logger.error("Error fetching meet details", { error })
    return fail(event, 500, MSG.internalError)
  }
}, {
  name: "meet-details",
  maxAge: 60 * 10,
  swr: true,
  // Only the meet identifier decides the response; nothing here varies by caller.
  getKey: (event) => getRouterParam(event, "id") ?? "unknown",
})

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, meetResults, legacyMeetResults } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"
import type { Attempt } from "~/types/attempts"
import type { Result, ResultRaw, LegacyResultRaw } from "~/types/results"

type AthleteDetailsResponse = {
  athlete: UserPrivate | UserPublic
  personalBest?: Attempt[]
  compHistory?: Result[]
}

// Find personal best attempts for an athlete
async function getPersonalBests(vpfId: string): Promise<Attempt[]> {
  // Query all modern meet results
  const modernResults = await db
    .select()
    .from(meetResults)
    .where(eq(meetResults.vpfId, vpfId))

  // Query all legacy meet results
  const legacyResults = await db
    .select()
    .from(legacyMeetResults)
    .where(eq(legacyMeetResults.vpfId, vpfId))

  const personalBests: Attempt[] = []
  
  // Track best for each lift
  let bestSquat: { weight: number; meetId: number; attempt: 1 | 2 | 3 } | null = null
  let bestBench: { weight: number; meetId: number; attempt: 1 | 2 | 3 } | null = null
  let bestDeadlift: { weight: number; meetId: number; attempt: 1 | 2 | 3 } | null = null

  // Process modern results
  for (const result of modernResults) {
    // Check squat attempts
    const squatAttempts = [
      { weight: result.squat1, attempt: 1 as const },
      { weight: result.squat2, attempt: 2 as const },
      { weight: result.squat3, attempt: 3 as const },
    ]
    
    for (const { weight, attempt } of squatAttempts) {
      if (weight !== null && weight > 0) {
        if (!bestSquat || weight > bestSquat.weight) {
          bestSquat = { weight, meetId: result.meetId, attempt }
        }
      }
    }

    // Check bench attempts
    const benchAttempts = [
      { weight: result.bench1, attempt: 1 as const },
      { weight: result.bench2, attempt: 2 as const },
      { weight: result.bench3, attempt: 3 as const },
    ]
    
    for (const { weight, attempt } of benchAttempts) {
      if (weight !== null && weight > 0) {
        if (!bestBench || weight > bestBench.weight) {
          bestBench = { weight, meetId: result.meetId, attempt }
        }
      }
    }

    // Check deadlift attempts
    const deadliftAttempts = [
      { weight: result.deadlift1, attempt: 1 as const },
      { weight: result.deadlift2, attempt: 2 as const },
      { weight: result.deadlift3, attempt: 3 as const },
    ]
    
    for (const { weight, attempt } of deadliftAttempts) {
      if (weight !== null && weight > 0) {
        if (!bestDeadlift || weight > bestDeadlift.weight) {
          bestDeadlift = { weight, meetId: result.meetId, attempt }
        }
      }
    }
  }

  // Process legacy results (they only have best lifts, not individual attempts)
  for (const result of legacyResults) {
    if (result.bestSquat !== null && result.bestSquat > 0) {
      if (!bestSquat || result.bestSquat > bestSquat.weight) {
        // For legacy, we don't know which attempt, so use attempt 1
        bestSquat = { weight: result.bestSquat, meetId: result.meetId, attempt: 1 }
      }
    }

    if (result.bestBench !== null && result.bestBench > 0) {
      if (!bestBench || result.bestBench > bestBench.weight) {
        bestBench = { weight: result.bestBench, meetId: result.meetId, attempt: 1 }
      }
    }

    if (result.bestDeadlift !== null && result.bestDeadlift > 0) {
      if (!bestDeadlift || result.bestDeadlift > bestDeadlift.weight) {
        bestDeadlift = { weight: result.bestDeadlift, meetId: result.meetId, attempt: 1 }
      }
    }
  }

  // Build Attempt array
  if (bestSquat) {
    personalBests.push({
      vpfId,
      meetId: bestSquat.meetId,
      lift: "squat",
      attempt: bestSquat.attempt,
      weight: bestSquat.weight,
    })
  }

  if (bestBench) {
    personalBests.push({
      vpfId,
      meetId: bestBench.meetId,
      lift: "bench",
      attempt: bestBench.attempt,
      weight: bestBench.weight,
    })
  }

  if (bestDeadlift) {
    personalBests.push({
      vpfId,
      meetId: bestDeadlift.meetId,
      lift: "deadlift",
      attempt: bestDeadlift.attempt,
      weight: bestDeadlift.weight,
    })
  }

  return personalBests
}

// Get competition history for an athlete
async function getCompetitionHistory(vpfId: string): Promise<Result[]> {
  // Query all modern meet results
  const modernResults = await db
    .select()
    .from(meetResults)
    .where(eq(meetResults.vpfId, vpfId))

  // Query all legacy meet results
  const legacyResults = await db
    .select()
    .from(legacyMeetResults)
    .where(eq(legacyMeetResults.vpfId, vpfId))

  // Combine and transform results
  const allRawResults: (ResultRaw | LegacyResultRaw)[] = [
    ...modernResults,
    ...legacyResults,
  ]

  // Transform results with metadata
  const transformedResults = addMetadataToMeetResults(allRawResults)

  // Sort by meet date (most recent first)
  // We need to join with meets to get the date, but for now we'll sort by meetId
  transformedResults.sort((a, b) => b.meetId - a.meetId)

  return transformedResults
}

export default defineEventHandler(async (event): Promise<ApiResponse<AthleteDetailsResponse>> => {
  try {
    const vpfId = getRouterParam(event, "id")
    const currentUser = event.context.user

    if (!vpfId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Athlete ID is required",
          vi: "ID vận động viên là bắt buộc",
        },
      }
    }

    // Determine scope for column selection:
    // - Admin: UserPrivate (can see full data, exclude password)
    // - User viewing own profile: UserPrivate (can see own full data, exclude password)
    // - Otherwise: UserPublic (restricted data, exclude sensitive fields)
    const isAdmin = currentUser?.role === "admin"
    const isOwnProfile = currentUser?.vpfId === vpfId
    const isPrivate = isAdmin || isOwnProfile

    // Query the athlete with appropriate columns based on scope
    let athlete
    if (isPrivate) {
      const result = await db
        .select(userPrivateSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    } else {
      const result = await db
        .select(userPublicSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    }

    if (!athlete) {
      setResponseStatus(event, 404)
      return {
        success: false,
        data: null,
        message: {
          en: "Athlete not found",
          vi: "Không tìm thấy vận động viên",
        },
      }
    }

    // Parse query parameters
    const query = getQuery(event)
    const include = query.include
    const includeArray = Array.isArray(include) ? include : include ? [include] : []

    const response: AthleteDetailsResponse = {
      athlete,
    }

    // Include personal best if requested
    if (includeArray.includes("personalBest")) {
      response.personalBest = await getPersonalBests(vpfId)
    }

    // Include competition history if requested
    if (includeArray.includes("compHistory")) {
      response.compHistory = await getCompetitionHistory(vpfId)
    }

    return {
      success: true,
      data: response,
      message: {
        en: "Athlete details retrieved successfully",
        vi: "Lấy thông tin vận động viên thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching athlete details", { error })
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

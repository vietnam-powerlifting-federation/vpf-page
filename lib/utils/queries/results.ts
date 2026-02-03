import { inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { legacyMeetResults, meetResults } from "~/lib/external/drizzle/migrations/schema"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { MeetPublic } from "~/types/meets"
import type { Result, LegacyResultRaw, ResultRaw } from "~/types/results"

/**
 * Fetches results for the given meets.
 * Handles both legacy and non-legacy meets by querying the appropriate table.
 * Results are automatically transformed with metadata (totals, GL points, placements).
 */
export async function getResultsForMeets(meets: MeetPublic[]): Promise<Result[]> {
  if (meets.length === 0) {
    return []
  }

  const legacyMeetIds = meets
    .filter(m => m.legacy === true)
    .map(m => m.meetId)

  const nonLegacyMeetIds = meets
    .filter(m => m.legacy === false)
    .map(m => m.meetId)

  const legacyResults: LegacyResultRaw[] = legacyMeetIds.length > 0
    ? await db
      .select()
      .from(legacyMeetResults)
      .where(inArray(legacyMeetResults.meetId, legacyMeetIds))
    : []

  const nonLegacyResults: ResultRaw[] = nonLegacyMeetIds.length > 0
    ? await db
      .select()
      .from(meetResults)
      .where(inArray(meetResults.meetId, nonLegacyMeetIds))
    : []

  // Combine and transform results
  const allRawResults = [...legacyResults, ...nonLegacyResults]
  return addMetadataToMeetResults(allRawResults)
}
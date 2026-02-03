import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { legacyMeetResults, meetResults } from "~/lib/external/drizzle/migrations/schema"
import { addMetadataToMeetResults } from "~/lib/utils/meet-result"
import type { Result, LegacyResultRaw, ResultRaw } from "~/types/results"

export type SortKey = "bestSquat" | "bestBench" | "bestDeadlift" | "total" | "gl"
export type MeetType = "national" | "amateur" | "professional" | "national_qualifier" | "other"

/**
 * Fetches all results for a given athlete (vpfId).
 * Handles both legacy and non-legacy results by querying the appropriate table.
 * Results are automatically transformed with metadata (totals, GL points, placements).
 */
export async function getResultsForAthlete(vpfId: string): Promise<Result[]> {
  // Query all modern meet results
  const modernResults: ResultRaw[] = await db
    .select()
    .from(meetResults)
    .where(eq(meetResults.vpfId, vpfId))

  // Query all legacy meet results
  const legacyResults: LegacyResultRaw[] = await db
    .select()
    .from(legacyMeetResults)
    .where(eq(legacyMeetResults.vpfId, vpfId))

  // Combine and transform results
  const allRawResults: (ResultRaw | LegacyResultRaw)[] = [
    ...modernResults,
    ...legacyResults,
  ]

  return addMetadataToMeetResults(allRawResults)
}

/**
 * Applies distinct filter to results - keeps only the best result per athlete based on sort key.
 */
export function applyDistinctFilter(results: Result[], sortKey: SortKey): Result[] {
  const athleteBestResults = new Map<string, Result>()
  
  for (const result of results) {
    const vpfId = result.vpfId
    const currentBest = athleteBestResults.get(vpfId)
    
    if (!currentBest) {
      athleteBestResults.set(vpfId, result)
    } else {
      // Compare based on sort key
      const currentValue = currentBest[sortKey]
      const newValue = result[sortKey]
      
      // Handle null values (null is considered worse than any number)
      if (currentValue === null && newValue !== null) {
        athleteBestResults.set(vpfId, result)
      } else if (currentValue !== null && newValue !== null) {
        // Both are numbers, compare (descending order - higher is better)
        if (newValue > currentValue) {
          athleteBestResults.set(vpfId, result)
        }
      }
      // If both are null or newValue is null, keep currentBest
    }
  }
  
  return Array.from(athleteBestResults.values())
}

/**
 * Sorts results by sort key in descending order (highest first).
 * Null values are placed at the end.
 */
export function sortResultsByKey(results: Result[], sortKey: SortKey): Result[] {
  return [...results].sort((a, b) => {
    const aValue = a[sortKey]
    const bValue = b[sortKey]
    
    // Handle null values (null goes to the end)
    if (aValue === null && bValue === null) return 0
    if (aValue === null) return 1
    if (bValue === null) return -1
    
    // Both are numbers, sort descending (higher is better)
    return bValue - aValue
  })
}

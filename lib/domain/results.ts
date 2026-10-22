import type { Result, PersonalBestSummary } from "~/types/results"

/**
 * Ranking and summary maths over results. Pure and isomorphic — the pages and the
 * API endpoints share these so a total shown on a profile is computed the same way
 * as one shown on the records table. Reading results is `server/repository/results`.
 */

export type SortKey = "bestSquat" | "bestBench" | "bestDeadlift" | "total" | "gl"
export type MeetType = "national" | "amateur" | "professional" | "national_qualifier" | "other"

/**
 * Computes personal best summary (best squat, bench, deadlift, total) from results.
 */
export function getPersonalBestSummary(results: Result[]): PersonalBestSummary {
  let squat: number | null = null
  let bench: number | null = null
  let deadlift: number | null = null
  let total: number | null = null

  for (const r of results) {
    if (r.bestSquat !== null && (squat === null || r.bestSquat > squat)) squat = r.bestSquat
    if (r.bestBench !== null && (bench === null || r.bestBench > bench)) bench = r.bestBench
    if (r.bestDeadlift !== null && (deadlift === null || r.bestDeadlift > deadlift)) deadlift = r.bestDeadlift
    if (r.total !== null && (total === null || r.total > total)) total = r.total
  }

  return { squat, bench, deadlift, total }
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

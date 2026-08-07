import { DISQUALIFIED } from "~/lib/constants/constants"
import { findMeetByIdentifier, getMeetDataset, MEETS_CACHE_PREFIX } from "~/server/repository/meets"
import { redisDelByPrefix } from "~/server/utils/redis"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"

export type ResultWithPlacements = Result & {
  squatPlacement: number
  benchPlacement: number
  deadliftPlacement: number
}

export type MeetDetails = {
  meet: MeetPublic
  results: ResultWithPlacements[]
  athletes: UserPublicWithDecorators[]
}

/**
 * A meet's public page: the meet, its results with per-lift placements, and the
 * athletes who competed.
 *
 * `null` means no such meet. Nothing here varies by caller — this is public data
 * only, which is what makes it safe to cache under the meet identifier alone.
 */
export async function getMeetDetails(identifier: string): Promise<MeetDetails | null> {
  const meet = await findMeetByIdentifier(identifier)
  if (!meet) return null

  const { results, athletes } = await getMeetDataset(meet.meetId)

  return {
    meet,
    results: addLiftPlacements(results),
    athletes,
  }
}

/**
 * Rank each lift separately within its sex/division/weight-class group.
 *
 * The overall placement on a result is by total; these are the "best squat in the
 * category" style standings the meet page shows alongside it.
 */
function addLiftPlacements(results: Result[]): ResultWithPlacements[] {
  const groups = new Map<string, Result[]>()

  for (const result of results) {
    const key = `${result.sex}-${result.division}-${result.weightClass}`
    const group = groups.get(key)
    if (group) group.push(result)
    else groups.set(key, [result])
  }

  const squat = new Map<string, number>()
  const bench = new Map<string, number>()
  const deadlift = new Map<string, number>()

  for (const group of groups.values()) {
    mergeInto(squat, rankByLift(group, "bestSquat"))
    mergeInto(bench, rankByLift(group, "bestBench"))
    mergeInto(deadlift, rankByLift(group, "bestDeadlift"))
  }

  return results.map((result) => {
    const key = resultKey(result)
    return {
      ...result,
      squatPlacement: squat.get(key) ?? DISQUALIFIED,
      benchPlacement: bench.get(key) ?? DISQUALIFIED,
      deadliftPlacement: deadlift.get(key) ?? DISQUALIFIED,
    }
  })
}

function resultKey(result: Result): string {
  return `${result.meetId}-${result.vpfId}`
}

function mergeInto(target: Map<string, number>, source: Map<string, number>): void {
  for (const [key, placement] of source) target.set(key, placement)
}

/** Heaviest lift wins; on a tie the lighter athlete wins. Disqualified results are unranked. */
function rankByLift(results: Result[], lift: "bestSquat" | "bestBench" | "bestDeadlift"): Map<string, number> {
  const ranked = results
    .filter((result) => result.placement !== DISQUALIFIED && result[lift] !== null && result[lift]! > 0)
    .sort((a, b) => {
      const aWeight = a[lift] ?? 0
      const bWeight = b[lift] ?? 0
      if (aWeight !== bWeight) return bWeight - aWeight
      return (a.bodyWeight ?? Infinity) - (b.bodyWeight ?? Infinity)
    })

  return new Map(ranked.map((result, index) => [resultKey(result), index + 1]))
}

/**
 * Drop every cached meet. Returns the number of keys removed.
 *
 * Deliberately prefix-wide rather than targeted at the meet that changed: a meet
 * is cached under both its id and its slug, a slug edit moves it between keys,
 * and a clone creates one. Meet writes are rare admin actions, so the cost of
 * over-invalidating is a cold read, while the cost of missing a key is a page
 * that stays wrong.
 */
export async function invalidateMeets(): Promise<number> {
  return redisDelByPrefix(MEETS_CACHE_PREFIX)
}

import { and, eq, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { cacheKey, redisRemember } from "~/server/utils/redis"
import type { ResultsDataset } from "~/server/repository/results"
import type { MeetPublic } from "~/types/meets"

/** Cache namespace owned by this repository; services invalidate through it. */
export const MEETS_CACHE_PREFIX = "vpf:meets"

/**
 * Resolve a meet from the public URL segment, which is either the numeric id or
 * the slug.
 *
 * Cached under the identifier as given, so one meet can occupy two entries — the
 * id and the slug. That duplication is why invalidation drops the whole `vpf:meets`
 * prefix rather than guessing which keys a meet is under.
 */
export async function findMeetByIdentifier(identifier: string): Promise<MeetPublic | null> {
  return redisRemember(cacheKey("meets", identifier), async () => {
    const meetId = parseInt(identifier, 10)
    const isNumericId = !isNaN(meetId) && String(meetId) === identifier

    const row = await db
      .select()
      .from(meets)
      .where(isNumericId ? eq(meets.meetId, meetId) : eq(meets.meetSlug, identifier))
      .limit(1)
      .then((rows) => rows[0])

    return row ?? null
  })
}

/** One meet's results and the athletes who competed in it. */
export async function getMeetDataset(meetId: number): Promise<ResultsDataset> {
  return redisRemember(
    cacheKey("meets", meetId, { part: "dataset" }),
    () => getMeetsAndResultsAndAthletes({ meetIds: [meetId] }),
  )
}

/**
 * The most recent year with a visible, non-legacy national meet — the year the
 * records pages default to when no year is requested.
 */
export async function getLatestNationalYear(): Promise<number | null> {
  return redisRemember(cacheKey("meets", "latest-national-year"), async () => {
    const row = await db
      .select({ maxYear: sql<number>`MAX(${meets.systemYear})` })
      .from(meets)
      .where(and(
        eq(meets.type, "national"),
        eq(meets.legacy, false),
        eq(meets.hidden, false),
      ))
      .then((rows) => rows[0])

    return row?.maxYear ?? null
  })
}

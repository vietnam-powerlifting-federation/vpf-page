import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionBanList, meets, users } from "~/lib/external/drizzle/migrations/schema"
import { getMeetsAndResultsAndAthletes } from "~/server/repository/dataset"
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

/**
 * The meet list. `includeHidden` is the admin console's view of unpublished
 * drafts; the public list has never shown them.
 *
 * Not cached, unlike the reads above: the result varies by caller, and a cache
 * keyed on the URL alone would eventually replay an admin's list to the public.
 */
export async function listMeets(includeHidden: boolean): Promise<MeetPublic[]> {
  return db
    .select()
    .from(meets)
    .where(includeHidden ? undefined : eq(meets.hidden, false))
    .orderBy(sql`${meets.hostDate} DESC`, sql`${meets.meetId} DESC`)
}

export async function insertMeet(values: typeof meets.$inferInsert): Promise<MeetPublic | undefined> {
  return db.insert(meets).values(values).returning().then((rows) => rows[0])
}

export async function updateMeet(
  meetId: number,
  patch: Partial<typeof meets.$inferInsert>,
): Promise<MeetPublic | null> {
  return db
    .update(meets)
    .set(patch)
    .where(eq(meets.meetId, meetId))
    .returning()
    .then((rows) => rows[0] ?? null)
}

export async function deleteMeet(meetId: number): Promise<void> {
  await db.delete(meets).where(eq(meets.meetId, meetId))
}

// --- competition ban list -------------------------------------------------

export async function listBanList(meetId: number) {
  return db
    .select({
      id: competitionBanList.id,
      meetId: competitionBanList.meetId,
      vpfId: competitionBanList.vpfId,
      reason: competitionBanList.reason,
      createdAt: competitionBanList.createdAt,
      userName: users.fullName,
    })
    .from(competitionBanList)
    .innerJoin(users, eq(users.vpfId, competitionBanList.vpfId))
    .where(eq(competitionBanList.meetId, meetId))
    .orderBy(desc(competitionBanList.createdAt))
}

/** Banning an already-banned athlete rewrites the reason rather than failing. */
export async function upsertBanListEntry(meetId: number, vpfId: string, reason: string) {
  return db
    .insert(competitionBanList)
    .values({ meetId, vpfId, reason })
    .onConflictDoUpdate({
      target: [competitionBanList.meetId, competitionBanList.vpfId],
      set: { reason },
    })
    .returning()
    .then((rows) => rows[0])
}

export async function deleteBanListEntry(meetId: number, vpfId: string) {
  return db
    .delete(competitionBanList)
    .where(and(eq(competitionBanList.meetId, meetId), eq(competitionBanList.vpfId, vpfId)))
    .returning({ id: competitionBanList.id })
    .then((rows) => rows[0] ?? null)
}

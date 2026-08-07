import { and, eq, ne } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { slugifyMeetName } from "~/lib/utils/meet-formatters"
import type { I18nMessage } from "~/server/utils/api-response"

export const MEET_NOT_FOUND: I18nMessage = { en: "Meet not found", vi: "Không tìm thấy meet" }

export const MEET_ADMIN_FORBIDDEN: I18nMessage = {
  en: "Only admins can manage meets",
  vi: "Chỉ quản trị viên mới có thể quản lý giải đấu",
}

export const BAN_LIST_FORBIDDEN: I18nMessage = {
  en: "Only admins can manage a meet's ban list",
  vi: "Chỉ quản trị viên mới có thể quản lý danh sách hạn chế của giải",
}

export const ENTRIES_FORBIDDEN: I18nMessage = {
  en: "Only admins can manage meet entries",
  vi: "Chỉ quản trị viên mới có thể quản lý danh sách thi đấu",
}

/**
 * `meets.meetSlug` had no unique constraint until migration 0018 (§11.1), and it
 * is the public URL. Resolve collisions here as well as in the database so staff
 * get a message naming the clash rather than a constraint violation.
 */
export async function isSlugTaken(slug: string, exceptMeetId?: number): Promise<boolean> {
  const row = await db
    .select({ meetId: meets.meetId })
    .from(meets)
    .where(exceptMeetId === undefined
      ? eq(meets.meetSlug, slug)
      : and(eq(meets.meetSlug, slug), ne(meets.meetId, exceptMeetId)))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

/** Derive a free slug from the meet name, appending `-2`, `-3`… only if it is taken. */
export async function deriveFreeSlug(meetName: string, exceptMeetId?: number): Promise<string> {
  const base = slugifyMeetName(meetName) || "meet"
  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`
    if (!(await isSlugTaken(candidate, exceptMeetId))) return candidate
  }
  return `${base}-${Date.now()}`
}

export const SLUG_TAKEN: I18nMessage = {
  en: "That URL slug is already used by another meet",
  vi: "Đường dẫn này đã được dùng cho một giải đấu khác",
}

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetResults } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { fetchEntryRoster } from "~/server/utils/entry-queries"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import type { ApiResponse } from "~/types/api"
import type { EntryRoster } from "~/types/entries"

export default defineEventHandler(async (event): Promise<ApiResponse<EntryRoster>> => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const entries = await fetchEntryRoster(meet.meetId)

    // Once results are imported the roster is history: the screen goes read-only
    // rather than inviting edits to a start list the meet has already outrun.
    const resultsImported = Boolean(await db
      .select({ resultId: meetResults.resultId })
      .from(meetResults)
      .where(eq(meetResults.meetId, meet.meetId))
      .limit(1)
      .then((rows) => rows[0]))

    const live = entries.filter((entry) => !entry.withdrawn)

    return ok(
      {
        meetId: meet.meetId,
        meetName: meet.meetName,
        entries,
        resultsImported,
        counts: {
          total: entries.length,
          withdrawn: entries.length - live.length,
          paid: live.filter((entry) => entry.purchaseStatus === "active").length,
          unpaid: live.filter((entry) => entry.purchaseStatus !== "active").length,
        },
      },
      { en: "Entries retrieved", vi: "Lấy danh sách thi đấu thành công" },
    )
  } catch (error) {
    logger.error("Error listing meet entries", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

import { meetHasResults, fetchEntryRoster } from "~/server/repository/entries"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import type { ApiResponse } from "~/types/api"
import type { EntryRoster } from "~/types/entries"

export default defineApiHandler(async (event): Promise<ApiResponse<EntryRoster>> => {
  const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const entries = await fetchEntryRoster(meet.meetId)

  // Once results are imported the roster is history: the screen goes read-only
  // rather than inviting edits to a start list the meet has already outrun.
  const resultsImported = await meetHasResults(meet.meetId)

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
})

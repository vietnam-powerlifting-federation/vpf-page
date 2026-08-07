import { logger } from "~/lib/logger/logger"
import { buildEntryExportCsv } from "~/lib/utils/liftingcast-export"
import { slugifyMeetName } from "~/lib/utils/meet-formatters"
import { fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { fetchEntryRoster } from "~/server/utils/entry-queries"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"

/**
 * The start list, in LiftingCast's entry-import format (§6.3).
 *
 * Returns raw CSV rather than the usual `ApiResponse` envelope — it is a file
 * download, and LiftingCast reads it directly. Errors still return the envelope,
 * so a failure is legible rather than a corrupt spreadsheet.
 */
export default defineEventHandler(async (event) => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const entries = await fetchEntryRoster(meet.meetId)
    const csv = buildEntryExportCsv(entries)

    const filename = `${slugifyMeetName(meet.meetName) || "meet"}-entries.csv`
    setHeader(event, "content-type", "text/csv; charset=utf-8")
    setHeader(event, "content-disposition", `attachment; filename="${filename}"`)

    logger.info("Entries exported", {
      meetId: meet.meetId,
      rows: entries.filter((entry) => !entry.withdrawn).length,
      exportedBy: auth.user.vpfId,
    })

    return csv
  } catch (error) {
    logger.error("Error exporting entries", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

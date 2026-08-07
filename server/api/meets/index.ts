import { desc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export default defineEventHandler(async (event): Promise<ApiResponse<MeetPublic[]>> => {
  try {
    // Hidden meets are the admin console's unpublished drafts, so the meet list
    // has to be able to show them — but only to an admin who asks (§2). Mirrors
    // the admin branch in /api/athletes.
    const isAdmin = event.context.user?.role === "admin"
    const includeHidden = isAdmin && String(getQuery(event).includeHidden) === "true"

    const allMeets = await db
      .select()
      .from(meets)
      .where(includeHidden ? undefined : eq(meets.hidden, false))
      .orderBy(desc(meets.hostDate), desc(meets.meetId))

    return ok(allMeets, {
      en: "Meets retrieved successfully",
      vi: "Lấy danh sách meet thành công",
    })
  } catch (error) {
    logger.error("Error fetching meets", { error })
    return fail(event, 500, MSG.internalError)
  }
})

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
    const allMeets = await db
      .select()
      .from(meets)
      .where(eq(meets.hidden, false))
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

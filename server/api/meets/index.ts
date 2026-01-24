import { desc, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export default defineEventHandler(async (event): Promise<ApiResponse<MeetPublic[]>> => {
  try {
    const allMeets = await db
      .select()
      .from(meets)
      .where(eq(meets.hidden, false))
      .orderBy(desc(meets.hostDate), desc(meets.meetId))

    return {
      success: true,
      data: allMeets,
      message: {
        en: "Meets retrieved successfully",
        vi: "Lấy danh sách meet thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching meets", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

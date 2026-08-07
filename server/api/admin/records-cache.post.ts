import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { invalidateMeetDetailsCache, invalidateRecordsCache } from "~/server/utils/cached-records"
import type { ApiResponse } from "~/types/api"

/**
 * Drop the cached records by hand (§3.6).
 *
 * A confirmed import already does this, so this exists for when the cache drifts
 * anyway — after a direct database fix, say. Without a visible button, staff hit
 * a records page that has not changed and import again.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<{ cleared: number }>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can rebuild the records cache",
      vi: "Chỉ quản trị viên mới có thể dựng lại bộ nhớ đệm kỷ lục",
    })
    if (!auth.ok) return auth.error

    const [records, meetPages] = await Promise.all([invalidateRecordsCache(), invalidateMeetDetailsCache()])
    const cleared = records + meetPages
    logger.info("Records cache cleared", { cleared, clearedBy: auth.user.vpfId })

    return ok({ cleared }, {
      en: "Records cache cleared; the next request rebuilds it",
      vi: "Đã xoá bộ nhớ đệm kỷ lục; yêu cầu tiếp theo sẽ dựng lại",
    })
  } catch (error) {
    logger.error("Error clearing records cache", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

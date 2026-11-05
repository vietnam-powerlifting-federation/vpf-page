import { pingDatabase } from "~/server/repository/health"
import { defineApiHandler } from "~/server/utils/api-handler"
import { fail, ok } from "~/server/utils/api-response"
import { pingRedis } from "~/server/utils/redis"
import type { ApiResponse } from "~/types/api"
import type { HealthStatus } from "~/types/health"

/**
 * For the external uptime check. Only the database decides the status code: the
 * cache is optional, so a Redis outage is reported in the body but still a 200.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<HealthStatus>> => {
  const [databaseUp, cache] = await Promise.all([pingDatabase(), pingRedis()])

  if (!databaseUp) {
    return fail(event, 503, {
      en: "Database unreachable",
      vi: "Không kết nối được cơ sở dữ liệu",
    })
  }

  return ok({ database: "ok", cache }, { en: "Healthy", vi: "Hoạt động bình thường" })
})

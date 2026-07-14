import type { ApiResponse } from "~/types/api"
import type { JwtPayload } from "~/lib/utils/jwt"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { logger } from "~/lib/logger/logger"

export default defineEventHandler(async (event): Promise<ApiResponse<JwtPayload>> => {
  const user = event.context.user
  logger.debug("Session retrieved", { user })
  if (!user) {
    return fail(event, 401, MSG.unauthorized)
  }

  return ok(user, { en: "Session retrieved successfully", vi: "Lấy phiên đăng nhập thành công" })
})

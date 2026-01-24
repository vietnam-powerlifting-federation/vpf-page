import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  const url = getRequestURL(event)
  const method = event.method
  const path = url.pathname

  logger.warn("Catch-all API route hit - endpoint not found", {
    method,
    path,
  })

  setResponseStatus(event, 404)
  return {
    success: false,
    data: null,
    message: {
      en: `Endpoint not found: ${method} ${path}`,
      vi: `Không tìm thấy endpoint: ${method} ${path}`,
    },
  }
})

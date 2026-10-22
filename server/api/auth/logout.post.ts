import { deleteCookie } from "h3"
import type { ApiResponse } from "~/types/api"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"

export default defineApiHandler(async (event): Promise<ApiResponse<null>> => {
  deleteCookie(event, "auth-token", { path: "/" })
  return ok(null, { en: "Logged out successfully", vi: "Đăng xuất thành công" })
})

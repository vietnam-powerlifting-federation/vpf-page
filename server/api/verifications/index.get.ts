import { z } from "zod"
import { listVerifications } from "~/server/repository/verifications"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerificationWithUser } from "~/types/verifications"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
import { requireAdmin } from "~/server/utils/auth-guard"

const StatusFilter = z.enum(["pending", "approved", "rejected"]).optional()

export default defineApiHandler(async (event): Promise<ApiResponse<IdentityVerificationWithUser[]>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can view verification submissions",
    vi: "Chỉ quản trị viên mới có thể xem hồ sơ xác minh",
  })
  if (!auth.ok) return auth.error

  const query = getQuery(event)
  const statusParsed = StatusFilter.safeParse(query.status)
  const statusFilter = statusParsed.success ? statusParsed.data : undefined

  const rows = await listVerifications(statusFilter)

  const data: IdentityVerificationWithUser[] = rows.map((r) => ({
    ...r.verification,
    userEmail: r.userEmail,
    userName: r.userName,
  }))

  return ok(data, { en: "Verifications retrieved", vi: "Lấy danh sách hồ sơ thành công" })
})

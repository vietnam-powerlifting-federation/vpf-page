import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerificationWithUser } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"

const StatusFilter = z.enum(["pending", "approved", "rejected"]).optional()

export default defineEventHandler(async (event): Promise<ApiResponse<IdentityVerificationWithUser[]>> => {
  try {
    const currentUser = event.context.user
    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<IdentityVerificationWithUser[]>
    }

    if (currentUser.role !== "admin") {
      return fail(event, 403, {
        en: "Only admins can view verification submissions",
        vi: "Chỉ quản trị viên mới có thể xem hồ sơ xác minh",
      }) as ApiResponse<IdentityVerificationWithUser[]>
    }

    const query = getQuery(event)
    const statusParsed = StatusFilter.safeParse(query.status)
    const statusFilter = statusParsed.success ? statusParsed.data : undefined

    const rows = await db
      .select({
        verification: identityVerifications,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(identityVerifications)
      .innerJoin(users, eq(identityVerifications.vpfId, users.vpfId))
      .where(statusFilter ? eq(identityVerifications.status, statusFilter) : undefined)
      .orderBy(desc(identityVerifications.submittedAt))

    const data: IdentityVerificationWithUser[] = rows.map((r) => ({
      ...r.verification,
      userEmail: r.userEmail,
      userName: r.userName,
    }))

    return ok(data, { en: "Verifications retrieved", vi: "Lấy danh sách hồ sơ thành công" })
  } catch (error) {
    logger.error("Error listing verifications", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<IdentityVerificationWithUser[]>
  }
})

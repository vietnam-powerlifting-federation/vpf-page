import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"

type SelfVerification = {
  emailVerified: boolean
  verification: IdentityVerification | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<SelfVerification>> => {
  try {
    const currentUser = event.context.user
    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<SelfVerification>
    }

    const account = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!account) {
      return fail(event, 404, { en: "User not found", vi: "Không tìm thấy người dùng" }) as ApiResponse<SelfVerification>
    }

    const verification = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    return ok(
      { emailVerified: account.emailVerified, verification },
      { en: "Verification status retrieved", vi: "Lấy trạng thái xác minh thành công" },
    )
  } catch (error) {
    logger.error("Error fetching verification status", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<SelfVerification>
  }
})

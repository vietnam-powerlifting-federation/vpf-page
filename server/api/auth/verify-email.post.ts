import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import { ok, fail } from "~/server/utils/api-response"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<{ emailVerified: boolean }>> => {
  try {
    const currentUser = event.context.user
    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<{ emailVerified: boolean }>
    }

    const VerifyEmailSchema = z.object({ code: z.string().trim().min(1) })
    const validated = await readZodBody(event, VerifyEmailSchema)
    if (!validated.success) {
      return fail(event, 400, { en: "Verification code is required", vi: "Mã xác minh là bắt buộc" }) as ApiResponse<{ emailVerified: boolean }>
    }

    const user = await db
      .select({
        emailVerified: users.emailVerified,
        code: users.emailVerificationCode,
        expiresAt: users.emailVerificationExpiresAt,
      })
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!user) {
      return fail(event, 404, { en: "User not found", vi: "Không tìm thấy người dùng" }) as ApiResponse<{ emailVerified: boolean }>
    }

    if (user.emailVerified) {
      return ok({ emailVerified: true }, { en: "Email already verified", vi: "Email đã được xác minh" })
    }

    if (!user.code || user.code !== validated.data.code) {
      logger.debug("Invalid email verification code", { vpfId: currentUser.vpfId })
      return fail(event, 400, { en: "Invalid verification code", vi: "Mã xác minh không hợp lệ" }) as ApiResponse<{ emailVerified: boolean }>
    }

    if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) {
      return fail(event, 400, { en: "Verification code has expired", vi: "Mã xác minh đã hết hạn" }) as ApiResponse<{ emailVerified: boolean }>
    }

    await db
      .update(users)
      .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiresAt: null })
      .where(eq(users.vpfId, currentUser.vpfId))

    logger.info("Email verified", { vpfId: currentUser.vpfId })

    return ok({ emailVerified: true }, { en: "Email verified successfully", vi: "Xác minh email thành công" })
  } catch (error) {
    logger.error("Email verification error", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<{ emailVerified: boolean }>
  }
})

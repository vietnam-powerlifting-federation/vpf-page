import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<{ emailVerified: boolean }>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const VerifyEmailSchema = z.object({ code: z.string().trim().min(1) })
    const validated = await readZodBody(event, VerifyEmailSchema)
    if (!validated.success) {
      return fail(event, 400, { en: "Verification code is required", vi: "Mã xác minh là bắt buộc" })
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
      return fail(event, 404, MSG.userNotFound)
    }

    if (user.emailVerified) {
      return ok({ emailVerified: true }, MSG.emailAlreadyVerified)
    }

    if (!user.code || user.code !== validated.data.code) {
      logger.debug("Invalid email verification code", { vpfId: currentUser.vpfId })
      return fail(event, 400, { en: "Invalid verification code", vi: "Mã xác minh không hợp lệ" })
    }

    if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) {
      return fail(event, 400, { en: "Verification code has expired", vi: "Mã xác minh đã hết hạn" })
    }

    await db
      .update(users)
      .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiresAt: null })
      .where(eq(users.vpfId, currentUser.vpfId))

    logger.info("Email verified", { vpfId: currentUser.vpfId })

    return ok({ emailVerified: true }, { en: "Email verified successfully", vi: "Xác minh email thành công" })
  } catch (error) {
    logger.error("Email verification error", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

import { z } from "zod"
import { findEmailVerificationState, markEmailVerified } from "~/server/repository/auth"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"

export default defineApiHandler(async (event): Promise<ApiResponse<{ emailVerified: boolean }>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const VerifyEmailSchema = z.object({ code: z.string().trim().min(1) })
  const validated = await readZodBody(event, VerifyEmailSchema)
  if (!validated.success) {
    return fail(event, 400, { en: "Verification code is required", vi: "Mã xác minh là bắt buộc" })
  }

  const user = await findEmailVerificationState(currentUser.vpfId)

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

  await markEmailVerified(currentUser.vpfId)

  logger.info("Email verified", { vpfId: currentUser.vpfId })

  return ok({ emailVerified: true }, { en: "Email verified successfully", vi: "Xác minh email thành công" })
})

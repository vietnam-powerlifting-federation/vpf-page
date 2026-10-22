import bcrypt from "bcryptjs"
import { z } from "zod"
import { findPasswordResetState, setPasswordAndClearReset } from "~/server/repository/auth"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { readZodBody } from "~/server/utils/validate"

const SALT_ROUNDS = 10

/**
 * Shared by the unknown-email and wrong-code cases so a caller cannot tell the
 * two apart and probe which emails are registered.
 */
const INVALID_CODE = {
  en: "Invalid or expired reset code",
  vi: "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
}

export default defineApiHandler(async (event): Promise<ApiResponse<null>> => {
  const ResetPasswordSchema = z.object({
    email: z.email().trim().toLowerCase(),
    code: z.string().trim().min(1),
    password: z.string().min(8),
  })

  const validated = await readZodBody(event, ResetPasswordSchema)
  if (!validated.success) {
    return fail(event, 400, MSG.invalidInput)
  }

  const { email, code, password } = validated.data

  const user = await findPasswordResetState(email)

  if (!user || !user.resetCode || user.resetCode !== code) {
    logger.debug("Invalid password reset code", { email })
    return fail(event, 400, INVALID_CODE)
  }

  if (!user.resetExpiresAt || new Date(user.resetExpiresAt).getTime() < Date.now()) {
    logger.debug("Expired password reset code", { vpfId: user.vpfId })
    return fail(event, 400, INVALID_CODE)
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  // Clearing the code makes it single-use.
  await setPasswordAndClearReset(user.vpfId, hashedPassword)

  logger.info("Password reset successfully", { vpfId: user.vpfId })

  return ok(null, { en: "Password reset successfully", vi: "Đặt lại mật khẩu thành công" })
})

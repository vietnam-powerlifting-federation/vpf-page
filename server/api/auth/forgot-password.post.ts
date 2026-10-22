import { randomInt } from "node:crypto"
import { z } from "zod"
import { findVpfIdByEmail, setPasswordResetCode } from "~/server/repository/auth"
import { logger } from "~/lib/logger/logger"
import { sendPasswordResetCodeEmail } from "~/lib/external/email"
import type { ApiResponse } from "~/types/api"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { readZodBody } from "~/server/utils/validate"

/** Password reset codes are valid for 30 minutes. */
const RESET_CODE_TTL_MS = 30 * 60 * 1000

function generateResetCode(): string {
  return String(randomInt(100000, 1000000))
}

/**
 * Always answers with the same success message whether or not the email is on
 * file, so the endpoint cannot be used to discover which emails are registered.
 */
const SENT_MESSAGE = {
  en: "If that email is registered, a reset code has been sent",
  vi: "Nếu email đã được đăng ký, mã đặt lại mật khẩu đã được gửi",
}

export default defineApiHandler(async (event): Promise<ApiResponse<null>> => {
  const ForgotPasswordSchema = z.object({
    email: z.email().trim().toLowerCase(),
  })

  const validated = await readZodBody(event, ForgotPasswordSchema)
  if (!validated.success) {
    return fail(event, 400, MSG.invalidInput)
  }

  const { email } = validated.data

  const vpfId = await findVpfIdByEmail(email)

  if (!vpfId) {
    logger.debug("Password reset requested for unknown email", { email })
    return ok(null, SENT_MESSAGE)
  }

  const code = generateResetCode()
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString()

  await setPasswordResetCode(vpfId, code, expiresAt)

  await sendPasswordResetCodeEmail(email, code)
  logger.info("Password reset code sent", { vpfId })

  return ok(null, SENT_MESSAGE)
})

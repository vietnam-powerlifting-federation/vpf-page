import { randomInt } from "node:crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { sendPasswordResetCodeEmail } from "~/lib/utils/email"
import type { ApiResponse } from "~/types/api"
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

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const ForgotPasswordSchema = z.object({
      email: z.email().trim().toLowerCase(),
    })

    const validated = await readZodBody(event, ForgotPasswordSchema)
    if (!validated.success) {
      return fail(event, 400, MSG.invalidInput)
    }

    const { email } = validated.data

    const user = await db
      .select({ vpfId: users.vpfId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((rows) => rows[0])

    if (!user) {
      logger.debug("Password reset requested for unknown email", { email })
      return ok(null, SENT_MESSAGE)
    }

    const code = generateResetCode()
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString()

    await db
      .update(users)
      .set({ passwordResetCode: code, passwordResetExpiresAt: expiresAt })
      .where(eq(users.vpfId, user.vpfId))

    await sendPasswordResetCodeEmail(email, code)
    logger.info("Password reset code sent", { vpfId: user.vpfId })

    return ok(null, SENT_MESSAGE)
  } catch (error) {
    logger.error("Forgot password error", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

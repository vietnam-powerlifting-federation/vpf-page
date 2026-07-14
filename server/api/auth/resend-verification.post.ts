import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { sendVerificationCodeEmail } from "~/lib/utils/email"
import type { ApiResponse } from "~/types/api"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"

/** Verification codes are valid for 30 minutes. */
const VERIFICATION_CODE_TTL_MS = 30 * 60 * 1000

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const user = await db
      .select({ email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!user) {
      return fail(event, 404, MSG.userNotFound)
    }

    if (user.emailVerified) {
      return ok(null, MSG.emailAlreadyVerified)
    }

    if (!user.email) {
      return fail(event, 400, { en: "No email on file", vi: "Không có email" })
    }

    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString()

    await db
      .update(users)
      .set({ emailVerificationCode: code, emailVerificationExpiresAt: expiresAt })
      .where(eq(users.vpfId, currentUser.vpfId))

    await sendVerificationCodeEmail(user.email, code)
    logger.info("Verification code resent", { vpfId: currentUser.vpfId })

    return ok(null, { en: "Verification code sent", vi: "Đã gửi mã xác minh" })
  } catch (error) {
    logger.error("Resend verification error", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"

type SelfVerification = {
  emailVerified: boolean
  identityVerified: boolean
  verification: IdentityVerification | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<SelfVerification>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const account = await db
      .select({ emailVerified: users.emailVerified, identityVerified: users.identityVerified })
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!account) {
      return fail(event, 404, MSG.userNotFound)
    }

    const verification = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    return ok(
      { emailVerified: account.emailVerified, identityVerified: account.identityVerified, verification },
      { en: "Verification status retrieved", vi: "Lấy trạng thái xác minh thành công" },
    )
  } catch (error) {
    logger.error("Error fetching verification status", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

import { findVerificationFlags, findVerificationSubmission } from "~/server/repository/verifications"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"

type SelfVerification = {
  emailVerified: boolean
  identityVerified: boolean
  verification: IdentityVerification | null
}

export default defineApiHandler(async (event): Promise<ApiResponse<SelfVerification>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const idParam = getRouterParam(event, "id")
  if (idParam !== "me" && idParam !== currentUser.vpfId) {
    return fail(event, 403, {
      en: "You may only view your own verification status",
      vi: "Bạn chỉ có thể xem trạng thái xác minh của mình",
    })
  }

  const account = await findVerificationFlags(currentUser.vpfId)
  if (!account) {
    return fail(event, 404, MSG.userNotFound)
  }

  const verification = await findVerificationSubmission(currentUser.vpfId)

  return ok(
    { emailVerified: account.emailVerified, identityVerified: account.identityVerified, verification },
    { en: "Verification status retrieved", vi: "Lấy trạng thái xác minh thành công" },
  )
})

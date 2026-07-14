import { approvePurchase } from "~/server/utils/approve-purchase"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { PurchaseApproved } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseApproved>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can approve purchases",
      vi: "Chỉ quản trị viên mới có thể duyệt giao dịch",
    })
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const refCode = getRouterParam(event, "refCode")
    if (!refCode) {
      return fail(event, 400, MSG.refCodeRequired)
    }

    const result = await approvePurchase(refCode, currentUser.vpfId)

    if (!result.success) {
      return fail(event, result.statusCode, result.message)
    }

    return ok(
      {
        purchaseId: result.purchaseId,
        refCode: result.refCode,
        status: "active",
        confirmedAt: result.confirmedAt,
        approvedBy: currentUser.vpfId,
        vipMembershipExpiresAt: result.vipMembershipExpiresAt,
      },
      { en: "Purchase approved successfully", vi: "Duyệt giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error approving purchase", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

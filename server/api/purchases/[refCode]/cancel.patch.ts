import { cancelPendingPurchase, findPurchaseByRefCode } from "~/server/repository/purchases"
import { logger } from "~/lib/logger/logger"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCancelled } from "~/types/purchases"

export default defineApiHandler(async (event): Promise<ApiResponse<PurchaseCancelled>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const refCode = getRouterParam(event, "refCode")
  if (!refCode) {
    return fail(event, 400, MSG.refCodeRequired)
  }

  const purchase = await findPurchaseByRefCode(refCode)

  if (!purchase) {
    return fail(event, 404, MSG.purchaseNotFound)
  }

  if (currentUser.role !== "admin" && purchase.vpfId !== currentUser.vpfId) {
    return fail(event, 403, {
      en: "You are not allowed to cancel this purchase",
      vi: "Bạn không có quyền hủy giao dịch này",
    })
  }

  if (purchase.status !== "pending") {
    return fail(event, 400, {
      en: "Only pending purchases can be cancelled",
      vi: "Chỉ có thể hủy các giao dịch đang chờ xử lý",
    })
  }

  const cancelledAt = new Date().toISOString()

  // Releasing the vouchers in the same transaction hands them back to the athlete
  // to spend elsewhere; expiry is re-checked at next use.
  await cancelPendingPurchase(refCode, purchase.purchaseId, cancelledAt)

  logger.info("Purchase cancelled", { purchaseId: purchase.purchaseId, refCode, cancelledBy: currentUser.vpfId })

  return ok(
    {
      purchaseId: purchase.purchaseId,
      refCode: purchase.refCode,
      status: "cancelled",
      cancelledAt,
    },
    { en: "Purchase cancelled successfully", vi: "Hủy giao dịch thành công" },
  )
})

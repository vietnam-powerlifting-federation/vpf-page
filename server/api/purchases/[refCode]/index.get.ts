import { findPurchaseByRefCode } from "~/server/repository/purchases"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { buildQrUrl } from "~/server/service/purchase-codes"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

export default defineApiHandler(async (event): Promise<ApiResponse<PurchaseStatus>> => {
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
      en: "You are not allowed to view this purchase",
      vi: "Bạn không có quyền xem giao dịch này",
    })
  }

  return ok(
    {
      purchaseId: purchase.purchaseId,
      refCode: purchase.refCode,
      type: purchase.type,
      amount: purchase.amount,
      status: purchase.status,
      createdAt: purchase.createdAt,
      confirmedAt: purchase.confirmedAt ?? null,
      cancelledAt: purchase.cancelledAt ?? null,
      ...(purchase.status === "pending" ? { qrUrl: buildQrUrl(purchase.refCode, purchase.amount) } : {}),
    },
    { en: "Purchase retrieved successfully", vi: "Lấy thông tin giao dịch thành công" },
  )
})

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { config } from "~/lib/config/config"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

function buildVietQrUrl(refCode: string, amount: number): string {
  const { bankId, accountNo, accountName } = config.vietqr
  const params = new URLSearchParams({ amount: String(amount), addInfo: `VPF${refCode}`, accountName })
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?${params.toString()}`
}

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseStatus>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const refCode = getRouterParam(event, "refCode")
    if (!refCode) {
      return fail(event, 400, MSG.refCodeRequired)
    }

    const purchase = await db
      .select({
        purchaseId: purchases.purchaseId,
        vpfId: purchases.vpfId,
        type: purchases.type,
        refCode: purchases.refCode,
        amount: purchases.amount,
        status: purchases.status,
        createdAt: purchases.createdAt,
        confirmedAt: purchases.confirmedAt,
        cancelledAt: purchases.cancelledAt,
      })
      .from(purchases)
      .where(eq(purchases.refCode, refCode))
      .limit(1)
      .then((rows) => rows[0])

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
        ...(purchase.status === "pending" ? { qrUrl: buildVietQrUrl(purchase.refCode, purchase.amount) } : {}),
      },
      { en: "Purchase retrieved successfully", vi: "Lấy thông tin giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error getting purchase", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

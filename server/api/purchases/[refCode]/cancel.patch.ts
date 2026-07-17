import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { releaseVouchers } from "~/server/utils/voucher-helpers"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCancelled } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseCancelled>> => {
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
        status: purchases.status,
        refCode: purchases.refCode,
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
    await db.transaction(async (tx) => {
      await tx
        .update(purchases)
        .set({ status: "cancelled", cancelledAt })
        .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

      await releaseVouchers(tx, purchase.purchaseId)
    })

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
  } catch (error) {
    logger.error("Error cancelling purchase", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

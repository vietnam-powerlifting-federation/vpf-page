import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCancelled } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseCancelled>> => {
  try {
    const currentUser = event.context.user

    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<PurchaseCancelled>
    }

    const refCode = getRouterParam(event, "refCode")
    if (!refCode) {
      return fail(event, 400, { en: "Ref code is required", vi: "Mã tham chiếu là bắt buộc" }) as ApiResponse<PurchaseCancelled>
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
      return fail(event, 404, { en: "Purchase not found", vi: "Không tìm thấy giao dịch" }) as ApiResponse<PurchaseCancelled>
    }

    if (currentUser.role !== "admin" && purchase.vpfId !== currentUser.vpfId) {
      return fail(event, 403, {
        en: "You are not allowed to cancel this purchase",
        vi: "Bạn không có quyền hủy giao dịch này",
      }) as ApiResponse<PurchaseCancelled>
    }

    if (purchase.status !== "pending") {
      return fail(event, 400, {
        en: "Only pending purchases can be cancelled",
        vi: "Chỉ có thể hủy các giao dịch đang chờ xử lý",
      }) as ApiResponse<PurchaseCancelled>
    }

    const cancelledAt = new Date().toISOString()

    await db
      .update(purchases)
      .set({ status: "cancelled", cancelledAt })
      .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

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
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseCancelled>
  }
})

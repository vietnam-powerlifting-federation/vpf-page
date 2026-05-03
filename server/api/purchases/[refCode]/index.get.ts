import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseStatus>> => {
  try {
    const currentUser = event.context.user

    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<PurchaseStatus>
    }

    const refCode = getRouterParam(event, "refCode")
    if (!refCode) {
      return fail(event, 400, { en: "Ref code is required", vi: "Mã tham chiếu là bắt buộc" }) as ApiResponse<PurchaseStatus>
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
      return fail(event, 404, { en: "Purchase not found", vi: "Không tìm thấy giao dịch" }) as ApiResponse<PurchaseStatus>
    }

    if (currentUser.role !== "admin" && purchase.vpfId !== currentUser.vpfId) {
      return fail(event, 403, {
        en: "You are not allowed to view this purchase",
        vi: "Bạn không có quyền xem giao dịch này",
      }) as ApiResponse<PurchaseStatus>
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
      },
      { en: "Purchase retrieved successfully", vi: "Lấy thông tin giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error getting purchase", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseStatus>
  }
})

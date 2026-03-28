import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"
import type { PurchaseApproved } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseApproved>> => {
  try {
    const currentUser = event.context.user

    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<PurchaseApproved>
    }

    if (currentUser.role !== "admin") {
      return fail(event, 403, {
        en: "Only admins can approve purchases",
        vi: "Chỉ quản trị viên mới có thể duyệt giao dịch",
      }) as ApiResponse<PurchaseApproved>
    }

    const refCode = getRouterParam(event, "refCode")
    if (!refCode) {
      return fail(event, 400, { en: "Ref code is required", vi: "Mã tham chiếu là bắt buộc" }) as ApiResponse<PurchaseApproved>
    }

    const purchase = await db
      .select({
        purchaseId: purchases.purchaseId,
        vpfId: purchases.vpfId,
        status: purchases.status,
        refCode: purchases.refCode,
        type: purchases.type,
      })
      .from(purchases)
      .where(eq(purchases.refCode, refCode))
      .limit(1)
      .then((rows) => rows[0])

    if (!purchase) {
      return fail(event, 404, { en: "Purchase not found", vi: "Không tìm thấy giao dịch" }) as ApiResponse<PurchaseApproved>
    }

    if (purchase.status !== "pending") {
      return fail(event, 400, {
        en: "Only pending purchases can be approved",
        vi: "Chỉ có thể duyệt các giao dịch đang chờ xử lý",
      }) as ApiResponse<PurchaseApproved>
    }

    const metadata = await db
      .select({ durationMonths: vipPurchaseMetadata.durationMonths })
      .from(vipPurchaseMetadata)
      .where(eq(vipPurchaseMetadata.purchaseId, purchase.purchaseId))
      .limit(1)
      .then((rows) => rows[0])

    if (!metadata) {
      logger.error("VIP purchase metadata not found", { purchaseId: purchase.purchaseId })
      return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseApproved>
    }

    const athlete = await db
      .select({ vipMembershipExpiresAt: users.vipMembershipExpiresAt })
      .from(users)
      .where(eq(users.vpfId, purchase.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!athlete) {
      return fail(event, 404, { en: "Athlete not found", vi: "Không tìm thấy vận động viên" }) as ApiResponse<PurchaseApproved>
    }

    // Extend from current expiry if still active, otherwise from today
    const today = new Date()
    const currentExpiry = athlete.vipMembershipExpiresAt ? new Date(athlete.vipMembershipExpiresAt) : null
    const baseDate = currentExpiry && currentExpiry > today ? currentExpiry : today

    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + metadata.durationMonths)
    const newExpiryDate = newExpiry.toISOString().split("T")[0]

    const confirmedAt = new Date().toISOString()

    await db
      .update(purchases)
      .set({ status: "active", confirmedAt, approvedBy: currentUser.vpfId })
      .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

    await db
      .update(users)
      .set({ vipMembershipExpiresAt: newExpiryDate })
      .where(eq(users.vpfId, purchase.vpfId))

    logger.info("Purchase approved", {
      purchaseId: purchase.purchaseId,
      refCode,
      approvedBy: currentUser.vpfId,
      vipMembershipExpiresAt: newExpiryDate,
    })

    return ok(
      {
        purchaseId: purchase.purchaseId,
        refCode: purchase.refCode,
        status: "active",
        confirmedAt,
        approvedBy: currentUser.vpfId,
        vipMembershipExpiresAt: newExpiryDate,
      },
      { en: "Purchase approved successfully", vi: "Duyệt giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error approving purchase", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseApproved>
  }
})

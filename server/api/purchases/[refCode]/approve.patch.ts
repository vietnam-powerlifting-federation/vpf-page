import { approvePurchase } from "~/server/utils/approve-purchase"
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

    const result = await approvePurchase(refCode, currentUser.vpfId)

    if (!result.success) {
      return fail(event, result.statusCode, result.message) as ApiResponse<PurchaseApproved>
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
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseApproved>
  }
})

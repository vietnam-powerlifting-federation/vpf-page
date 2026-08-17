import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { buildQrUrl } from "~/server/utils/purchase-helpers"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseStatus[]>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const idParam = getRouterParam(event, "id")
    const vpfId = idParam === "me" ? currentUser.vpfId : idParam
    if (!vpfId) {
      return fail(event, 400, {
        en: "Athlete ID is required",
        vi: "ID vận động viên là bắt buộc",
      })
    }

    const isSelf = idParam === "me" || currentUser.vpfId === vpfId
    if (!isSelf && currentUser.role !== "admin") {
      return fail(event, 403, {
        en: "You may only view your own purchases, or an admin may view any athlete's",
        vi: "Bạn chỉ có thể xem giao dịch của mình, hoặc admin có thể xem của bất kỳ vận động viên nào",
      })
    }

    const rows = await db
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
      .where(eq(purchases.vpfId, vpfId))
      .orderBy(purchases.createdAt)

    return ok(
      rows.map((p) => ({
        purchaseId: p.purchaseId,
        refCode: p.refCode,
        type: p.type,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        confirmedAt: p.confirmedAt ?? null,
        cancelledAt: p.cancelledAt ?? null,
        ...(p.status === "pending" ? { qrUrl: buildQrUrl(p.refCode, p.amount) } : {}),
      })),
      { en: "Purchases retrieved successfully", vi: "Lấy danh sách giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error listing purchases", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

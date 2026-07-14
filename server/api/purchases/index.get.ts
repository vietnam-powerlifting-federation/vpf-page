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

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseStatus[]>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

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
      .where(eq(purchases.vpfId, currentUser.vpfId))
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
        ...(p.status === "pending" ? { qrUrl: buildVietQrUrl(p.refCode, p.amount) } : {}),
      })),
      { en: "Purchases retrieved successfully", vi: "Lấy danh sách giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error listing purchases", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { I18nMessage } from "~/server/utils/api-response"

type ApprovalSuccess = {
  success: true
  purchaseId: number
  refCode: string
  confirmedAt: string
  vipMembershipExpiresAt: string
}

type ApprovalFailure = {
  success: false
  statusCode: number
  message: I18nMessage
}

export type ApprovalResult = ApprovalSuccess | ApprovalFailure

export async function approvePurchase(refCode: string, approvedBy: string | null): Promise<ApprovalResult> {
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
    return { success: false, statusCode: 404, message: { en: "Purchase not found", vi: "Không tìm thấy giao dịch" } }
  }

  if (purchase.status !== "pending") {
    return {
      success: false,
      statusCode: 400,
      message: { en: "Only pending purchases can be approved", vi: "Chỉ có thể duyệt các giao dịch đang chờ xử lý" },
    }
  }

  const metadata = await db
    .select({ durationMonths: vipPurchaseMetadata.durationMonths })
    .from(vipPurchaseMetadata)
    .where(eq(vipPurchaseMetadata.purchaseId, purchase.purchaseId))
    .limit(1)
    .then((rows) => rows[0])

  if (!metadata) {
    logger.error("VIP purchase metadata not found", { purchaseId: purchase.purchaseId })
    return { success: false, statusCode: 500, message: { en: "Internal server error", vi: "Lỗi máy chủ" } }
  }

  const athlete = await db
    .select({ vipMembershipExpiresAt: users.vipMembershipExpiresAt })
    .from(users)
    .where(eq(users.vpfId, purchase.vpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!athlete) {
    return { success: false, statusCode: 404, message: { en: "Athlete not found", vi: "Không tìm thấy vận động viên" } }
  }

  // Extend from current expiry if still active, otherwise from today
  const today = new Date()
  const currentExpiry = athlete.vipMembershipExpiresAt ? new Date(athlete.vipMembershipExpiresAt) : null
  const baseDate = currentExpiry && currentExpiry > today ? currentExpiry : today

  const newExpiry = new Date(baseDate)
  newExpiry.setMonth(newExpiry.getMonth() + metadata.durationMonths)
  const vipMembershipExpiresAt = newExpiry.toISOString().split("T")[0]

  const confirmedAt = new Date().toISOString()

  await db
    .update(purchases)
    .set({ status: "active", confirmedAt, approvedBy })
    .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

  await db
    .update(users)
    .set({ vipMembershipExpiresAt })
    .where(eq(users.vpfId, purchase.vpfId))

  logger.info("Purchase approved", {
    purchaseId: purchase.purchaseId,
    refCode,
    approvedBy,
    vipMembershipExpiresAt,
  })

  return { success: true, purchaseId: purchase.purchaseId, refCode, confirmedAt, vipMembershipExpiresAt }
}

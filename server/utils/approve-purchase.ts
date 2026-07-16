import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata, vpfMembershipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import type { I18nMessage } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { PurchaseType } from "~/types/union-types"

type ApprovalSuccess = {
  success: true
  purchaseId: number
  refCode: string
  confirmedAt: string
  type: PurchaseType[]
  vipMembershipExpiresAt: string | null
  vpfMembershipExpiresAt: string | null
}

type ApprovalFailure = {
  success: false
  statusCode: number
  message: I18nMessage
}

export type ApprovalResult = ApprovalSuccess | ApprovalFailure

/**
 * Single activation point for every purchase (SePay webhook + admin approve).
 * A purchase may span several categories (`purchases.type` is an array), so we
 * dispatch on each type: `vip` extends VIP membership, `vpf_membership` extends
 * VPF membership, and `competition` simply confirms the entry (the registration
 * itself lives in `competition_purchase_metadata`, written at creation time).
 */
export async function approvePurchase(refCode: string, approvedBy: string | null): Promise<ApprovalResult> {
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
    return { success: false, statusCode: 404, message: MSG.purchaseNotFound }
  }

  if (purchase.status !== "pending") {
    return {
      success: false,
      statusCode: 400,
      message: { en: "Only pending purchases can be approved", vi: "Chỉ có thể duyệt các giao dịch đang chờ xử lý" },
    }
  }

  const athlete = await db
    .select({
      vipMembershipExpiresAt: users.vipMembershipExpiresAt,
      vpfMembershipExpiresAt: users.vpfMembershipExpiresAt,
    })
    .from(users)
    .where(eq(users.vpfId, purchase.vpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!athlete) {
    return { success: false, statusCode: 404, message: MSG.athleteNotFound }
  }

  const today = new Date()
  const userUpdate: Partial<{ vipMembershipExpiresAt: string; vpfMembershipExpiresAt: string }> = {}
  let vipMembershipExpiresAt = athlete.vipMembershipExpiresAt ?? null
  let vpfMembershipExpiresAt = athlete.vpfMembershipExpiresAt ?? null

  if (purchase.type.includes("vip")) {
    const metadata = await db
      .select({ durationMonths: vipPurchaseMetadata.durationMonths })
      .from(vipPurchaseMetadata)
      .where(eq(vipPurchaseMetadata.purchaseId, purchase.purchaseId))
      .limit(1)
      .then((rows) => rows[0])

    if (!metadata) {
      logger.error("VIP purchase metadata not found", { purchaseId: purchase.purchaseId })
      return { success: false, statusCode: 500, message: MSG.internalError }
    }

    // Extend from current expiry if still active, otherwise from today.
    const currentExpiry = vipMembershipExpiresAt ? new Date(vipMembershipExpiresAt) : null
    const baseDate = currentExpiry && currentExpiry > today ? currentExpiry : today
    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + metadata.durationMonths)
    vipMembershipExpiresAt = newExpiry.toISOString().split("T")[0]
    userUpdate.vipMembershipExpiresAt = vipMembershipExpiresAt
  }

  if (purchase.type.includes("vpf_membership")) {
    const metadata = await db
      .select({ membershipYear: vpfMembershipPurchaseMetadata.membershipYear })
      .from(vpfMembershipPurchaseMetadata)
      .where(eq(vpfMembershipPurchaseMetadata.purchaseId, purchase.purchaseId))
      .limit(1)
      .then((rows) => rows[0])

    if (!metadata) {
      logger.error("VPF membership purchase metadata not found", { purchaseId: purchase.purchaseId })
      return { success: false, statusCode: 500, message: MSG.internalError }
    }

    // Membership runs to the end of the paid year; keep the later of current vs new.
    const newExpiry = `${metadata.membershipYear}-12-31`
    if (!vpfMembershipExpiresAt || newExpiry > vpfMembershipExpiresAt) {
      vpfMembershipExpiresAt = newExpiry
    }
    userUpdate.vpfMembershipExpiresAt = vpfMembershipExpiresAt
  }

  const confirmedAt = new Date().toISOString()

  await db
    .update(purchases)
    .set({ status: "active", confirmedAt, approvedBy })
    .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

  if (Object.keys(userUpdate).length > 0) {
    await db.update(users).set(userUpdate).where(eq(users.vpfId, purchase.vpfId))
  }

  logger.info("Purchase approved", {
    purchaseId: purchase.purchaseId,
    refCode,
    approvedBy,
    type: purchase.type,
    vipMembershipExpiresAt,
    vpfMembershipExpiresAt,
  })

  return {
    success: true,
    purchaseId: purchase.purchaseId,
    refCode,
    confirmedAt,
    type: purchase.type,
    vipMembershipExpiresAt,
    vpfMembershipExpiresAt,
  }
}

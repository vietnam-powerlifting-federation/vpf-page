import { eq, TransactionRollbackError } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { VIP_MEMBERSHIP_PLANS } from "~/lib/constants/constants"
import { computeVoucherTotals, type LineItems } from "~/lib/utils/vouchers"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"
import { buildVietQrUrl, generateUniqueRefCode } from "~/server/utils/purchase-helpers"
import { resolveVouchers, redeemVouchers, collectRedemptions } from "~/server/utils/voucher-helpers"
import { approvePurchase } from "~/server/utils/approve-purchase"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated } from "~/types/purchases"

const CreatePurchaseSchema = z.object({
  plan: z.enum(["6months", "1year"]),
  type: z.enum(["vip", "vpf_membership", "competition"]).optional().default("vip"),
  vpfId: z.string().optional(),
  voucherCode: z.string().trim().min(1).optional(),
})

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseCreated>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const validated = await readZodBody(event, CreatePurchaseSchema)
    if (!validated.success) {
      return fail(event, 400, MSG.invalidInput)
    }

    const { plan, type, vpfId: targetVpfId, voucherCode } = validated.data

    // Determine the target athlete
    let resolvedVpfId = currentUser.vpfId
    if (targetVpfId && targetVpfId !== currentUser.vpfId) {
      if (currentUser.role !== "admin") {
        return fail(event, 403, {
          en: "Only admins can create purchases for other athletes",
          vi: "Chỉ quản trị viên mới có thể tạo giao dịch cho vận động viên khác",
        })
      }

      const targetUser = await db
        .select({ vpfId: users.vpfId })
        .from(users)
        .where(eq(users.vpfId, targetVpfId))
        .limit(1)
        .then((rows) => rows[0])

      if (!targetUser) {
        return fail(event, 404, MSG.athleteNotFound)
      }

      resolvedVpfId = targetVpfId
    }

    const planConfig = VIP_MEMBERSHIP_PLANS[plan]

    // Vouchers resolve against the target athlete, not the admin creating the purchase.
    const lineItems: LineItems = { [type]: planConfig.amount }
    const vouchers = await resolveVouchers({
      codes: voucherCode ? [voucherCode] : [],
      vpfId: resolvedVpfId,
      purchaseTypes: [type],
      lineItems,
    })
    if (!vouchers.ok) return fail(event, vouchers.statusCode, vouchers.message)

    const totals = computeVoucherTotals(lineItems, vouchers.vouchers)
    const redemptions = collectRedemptions(totals)
    const amount = totals.payable
    const refCode = await generateUniqueRefCode()

    let created: { purchaseId: number; createdAt: string }
    try {
      created = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(purchases)
          .values({
            vpfId: resolvedVpfId,
            type: [type],
            refCode,
            amount,
            status: "pending",
          })
          .returning({
            purchaseId: purchases.purchaseId,
            createdAt: purchases.createdAt,
          })

        await tx.insert(vipPurchaseMetadata).values({
          purchaseId: inserted.purchaseId,
          durationMonths: planConfig.durationMonths,
        })

        // Losing a redemption race means someone else spent the voucher first; roll
        // back rather than issue a discounted purchase against an already-spent one.
        if (!(await redeemVouchers(tx, redemptions, inserted.purchaseId))) {
          tx.rollback()
        }

        return inserted
      })
    } catch (error) {
      if (error instanceof TransactionRollbackError) {
        return fail(event, 409, {
          en: "That voucher has just been used; please try again",
          vi: "Voucher vừa được sử dụng; vui lòng thử lại",
        })
      }
      throw error
    }

    logger.info("Purchase created", {
      purchaseId: created.purchaseId,
      refCode,
      vpfId: resolvedVpfId,
      plan,
      amount,
      vouchers: redemptions.map((v) => v.code),
    })

    const appliedVouchers = redemptions.map(({ code, type: t, discount }) => ({ code, type: t, discount }))
    const body = {
      purchaseId: created.purchaseId,
      refCode,
      type: [type],
      plan,
      amount,
      createdAt: created.createdAt,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      vouchers: appliedVouchers,
    }

    // A fully-discounted purchase has no QR and no webhook to wait for — activate it
    // through the same single activation point the webhook uses.
    if (amount === 0) {
      const approval = await approvePurchase(refCode, null)
      if (!approval.success) {
        logger.error("Failed to auto-activate zero-amount purchase", { refCode, purchaseId: created.purchaseId })
        return fail(event, approval.statusCode, approval.message)
      }
      return ok(
        { ...body, status: "active" as const },
        { en: "Purchase activated with voucher", vi: "Giao dịch đã được kích hoạt bằng voucher" },
      )
    }

    return ok(
      { ...body, status: "pending" as const, qrUrl: buildVietQrUrl(refCode, amount) },
      { en: "Purchase created successfully", vi: "Tạo giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error creating purchase", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

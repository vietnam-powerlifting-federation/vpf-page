import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { VIP_MEMBERSHIP_PLANS } from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"
import { buildVietQrUrl, generateUniqueRefCode } from "~/server/utils/purchase-helpers"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated } from "~/types/purchases"

const CreatePurchaseSchema = z.object({
  plan: z.enum(["6months", "1year"]),
  type: z.enum(["vip", "vpf_membership", "competition"]).optional().default("vip"),
  vpfId: z.string().optional(),
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

    const { plan, type, vpfId: targetVpfId } = validated.data

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
    const refCode = await generateUniqueRefCode()

    const [inserted] = await db
      .insert(purchases)
      .values({
        vpfId: resolvedVpfId,
        type: [type],
        refCode,
        amount: planConfig.amount,
        status: "pending",
      })
      .returning({
        purchaseId: purchases.purchaseId,
        createdAt: purchases.createdAt,
      })

    if (!inserted) {
      logger.error("Failed to insert purchase", { vpfId: resolvedVpfId, plan })
      return fail(event, 500, { en: "Failed to create purchase", vi: "Không thể tạo giao dịch" })
    }

    await db.insert(vipPurchaseMetadata).values({
      purchaseId: inserted.purchaseId,
      durationMonths: planConfig.durationMonths,
    })

    logger.info("Purchase created", { purchaseId: inserted.purchaseId, refCode, vpfId: resolvedVpfId, plan })

    return ok(
      {
        purchaseId: inserted.purchaseId,
        refCode,
        type: [type],
        plan,
        amount: planConfig.amount,
        status: "pending",
        createdAt: inserted.createdAt,
        qrUrl: buildVietQrUrl(refCode, planConfig.amount),
      },
      { en: "Purchase created successfully", vi: "Tạo giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error creating purchase", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

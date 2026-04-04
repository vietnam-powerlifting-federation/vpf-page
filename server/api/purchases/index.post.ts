import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vipPurchaseMetadata } from "~/lib/external/drizzle/migrations/schema"
import { VIP_MEMBERSHIP_PLANS } from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated } from "~/types/purchases"

const CreatePurchaseSchema = z.object({
  plan: z.enum(["6months", "1year"]),
  type: z.enum(["vip", "vpf_membership", "competition"]).optional().default("vip"),
  vpfId: z.string().optional(),
})

async function generateUniqueRefCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")
    const existing = await db
      .select({ refCode: purchases.refCode })
      .from(purchases)
      .where(eq(purchases.refCode, code))
      .limit(1)
      .then((rows) => rows[0])
    if (!existing) return code
  }
  throw new Error("Failed to generate unique ref code after 10 attempts")
}

export default defineEventHandler(async (event): Promise<ApiResponse<PurchaseCreated>> => {
  try {
    const currentUser = event.context.user

    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<PurchaseCreated>
    }

    const validated = await readZodBody(event, CreatePurchaseSchema)
    if (!validated.success) {
      return fail(event, 400, { en: "Invalid input data", vi: "Dữ liệu đầu vào không hợp lệ" }) as ApiResponse<PurchaseCreated>
    }

    const { plan, type, vpfId: targetVpfId } = validated.data

    // Determine the target athlete
    let resolvedVpfId = currentUser.vpfId
    if (targetVpfId && targetVpfId !== currentUser.vpfId) {
      if (currentUser.role !== "admin") {
        return fail(event, 403, {
          en: "Only admins can create purchases for other athletes",
          vi: "Chỉ quản trị viên mới có thể tạo giao dịch cho vận động viên khác",
        }) as ApiResponse<PurchaseCreated>
      }

      const targetUser = await db
        .select({ vpfId: users.vpfId })
        .from(users)
        .where(eq(users.vpfId, targetVpfId))
        .limit(1)
        .then((rows) => rows[0])

      if (!targetUser) {
        return fail(event, 404, { en: "Athlete not found", vi: "Không tìm thấy vận động viên" }) as ApiResponse<PurchaseCreated>
      }

      resolvedVpfId = targetVpfId
    }

    const planConfig = VIP_MEMBERSHIP_PLANS[plan]
    const refCode = await generateUniqueRefCode()

    const [inserted] = await db
      .insert(purchases)
      .values({
        vpfId: resolvedVpfId,
        type,
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
      return fail(event, 500, { en: "Failed to create purchase", vi: "Không thể tạo giao dịch" }) as ApiResponse<PurchaseCreated>
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
        type,
        plan,
        amount: planConfig.amount,
        status: "pending",
        createdAt: inserted.createdAt,
      },
      { en: "Purchase created successfully", vi: "Tạo giao dịch thành công" },
    )
  } catch (error) {
    logger.error("Error creating purchase", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<PurchaseCreated>
  }
})

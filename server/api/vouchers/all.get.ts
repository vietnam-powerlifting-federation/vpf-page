import { and, desc, eq, isNull, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/utils/vouchers"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { VoucherWithUser } from "~/types/vouchers"

/**
 * Every athlete's vouchers, for the admin management page. Kept separate from
 * `GET /api/vouchers`, which is athlete-scoped by design and must never grow a
 * vpfId param (see the voucher system spec §4).
 */
const AdminVoucherQuerySchema = z.object({
  vpfId: z.string().optional(),
  type: z.enum(["vip", "vpf_membership", "competition"]).optional(),
  redeemed: z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).optional(),
})

export default defineEventHandler(async (event): Promise<ApiResponse<VoucherWithUser[]>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can view all vouchers",
      vi: "Chỉ quản trị viên mới có thể xem tất cả voucher",
    })
    if (!auth.ok) return auth.error

    const parsed = AdminVoucherQuerySchema.safeParse(getQuery(event))
    if (!parsed.success) return fail(event, 400, MSG.invalidInput)
    const { vpfId, type, redeemed } = parsed.data

    const today = todayIso()

    const rows = await db
      .select({
        voucherId: vouchers.voucherId,
        code: vouchers.code,
        vpfId: vouchers.vpfId,
        type: vouchers.type,
        discountKind: vouchers.discountKind,
        discountValue: vouchers.discountValue,
        expiresAt: vouchers.expiresAt,
        redeemedPurchaseId: vouchers.redeemedPurchaseId,
        redeemedAt: vouchers.redeemedAt,
        discountApplied: vouchers.discountApplied,
        note: vouchers.note,
        createdAt: vouchers.createdAt,
        redeemedRefCode: purchases.refCode,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(vouchers)
      .innerJoin(users, eq(users.vpfId, vouchers.vpfId))
      .leftJoin(purchases, eq(purchases.purchaseId, vouchers.redeemedPurchaseId))
      .where(
        and(
          vpfId ? eq(vouchers.vpfId, vpfId) : undefined,
          type ? eq(vouchers.type, type) : undefined,
          redeemed === true ? isNotNull(vouchers.redeemedPurchaseId) : undefined,
          redeemed === false ? isNull(vouchers.redeemedPurchaseId) : undefined,
        ),
      )
      .orderBy(desc(vouchers.createdAt))

    const data: VoucherWithUser[] = rows.map((row) => ({
      ...row,
      redeemedRefCode: row.redeemedRefCode ?? null,
      status: voucherStatus(row, today),
    }))

    return ok(data, { en: "Vouchers retrieved", vi: "Lấy danh sách voucher thành công" })
  } catch (error) {
    logger.error("Error listing all vouchers", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

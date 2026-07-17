import { and, desc, eq, gte, isNull } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/utils/vouchers"
import { VoucherListQuerySchema } from "~/lib/zod/schemas/voucher.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { Voucher } from "~/types/vouchers"

/**
 * The athlete's own vouchers, newest first. Never returns another athlete's rows
 * and takes no vpfId param — ownership is always the session's.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<Voucher[]>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const parsed = VoucherListQuerySchema.safeParse(getQuery(event))
    if (!parsed.success) return fail(event, 400, MSG.invalidInput)
    const { type, available } = parsed.data

    const today = todayIso()

    const rows = await db
      .select({
        voucherId: vouchers.voucherId,
        code: vouchers.code,
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
      })
      .from(vouchers)
      .leftJoin(purchases, eq(purchases.purchaseId, vouchers.redeemedPurchaseId))
      .where(
        and(
          eq(vouchers.vpfId, currentUser.vpfId),
          type ? eq(vouchers.type, type) : undefined,
          // "available" is what a purchase form should offer: unredeemed and unexpired.
          available ? isNull(vouchers.redeemedPurchaseId) : undefined,
          available ? gte(vouchers.expiresAt, today) : undefined,
        ),
      )
      .orderBy(desc(vouchers.createdAt))

    const data: Voucher[] = rows.map((row) => ({
      ...row,
      redeemedRefCode: row.redeemedRefCode ?? null,
      status: voucherStatus(row, today),
    }))

    return ok(data, { en: "Vouchers retrieved", vi: "Lấy danh sách voucher thành công" })
  } catch (error) {
    logger.error("Error listing vouchers", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

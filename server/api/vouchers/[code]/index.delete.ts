import { and, eq, isNull } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { VoucherRevoked } from "~/types/vouchers"

/**
 * Revoke an unredeemed voucher. A redeemed voucher is part of a purchase's price
 * history and must not vanish — deleting the athlete cascades it away instead.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<VoucherRevoked>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can revoke vouchers",
      vi: "Chỉ quản trị viên mới có thể thu hồi voucher",
    })
    if (!auth.ok) return auth.error

    const code = getRouterParam(event, "code")
    if (!code) return fail(event, 400, MSG.invalidInput)

    const voucher = await db
      .select({
        voucherId: vouchers.voucherId,
        code: vouchers.code,
        vpfId: vouchers.vpfId,
        redeemedPurchaseId: vouchers.redeemedPurchaseId,
      })
      .from(vouchers)
      .where(eq(vouchers.code, code))
      .limit(1)
      .then((rows) => rows[0])

    if (!voucher) {
      return fail(event, 404, { en: "Voucher not found", vi: "Không tìm thấy voucher" })
    }

    if (voucher.redeemedPurchaseId !== null) {
      return fail(event, 409, {
        en: "A redeemed voucher cannot be revoked",
        vi: "Không thể thu hồi voucher đã được sử dụng",
      })
    }

    // The IS NULL guard closes the gap between the read above and this delete —
    // a voucher redeemed in between must survive.
    const deleted = await db
      .delete(vouchers)
      .where(and(eq(vouchers.voucherId, voucher.voucherId), isNull(vouchers.redeemedPurchaseId)))
      .returning({ voucherId: vouchers.voucherId })

    if (deleted.length !== 1) {
      return fail(event, 409, {
        en: "A redeemed voucher cannot be revoked",
        vi: "Không thể thu hồi voucher đã được sử dụng",
      })
    }

    logger.info("Voucher revoked", { voucherId: voucher.voucherId, code, vpfId: voucher.vpfId })

    return ok(
      { voucherId: voucher.voucherId, code: voucher.code },
      { en: "Voucher revoked successfully", vi: "Thu hồi voucher thành công" },
    )
  } catch (error) {
    logger.error("Error revoking voucher", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

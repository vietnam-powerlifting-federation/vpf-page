import { count, isNotNull, isNull, lt, sql, sum, and } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"

type VoucherStats = {
  issued: number
  redeemed: number
  /** Unredeemed and past their expiry date. */
  expired: number
  available: number
  /** Total VND actually discounted, frozen at redemption. */
  totalDiscount: number
}

/**
 * Issued vs redeemed vs expired, and what it cost (§8).
 *
 * "Used" wins over "expired": a voucher redeemed before its date is a redemption,
 * not an expiry, which is the same precedence `voucherStatus` applies athlete-side.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<VoucherStats>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can view voucher statistics",
      vi: "Chỉ quản trị viên mới có thể xem thống kê voucher",
    })
    if (!auth.ok) return auth.error

    const [issued, redeemed, expired, totals] = await Promise.all([
      db.select({ value: count() }).from(vouchers).then((rows) => rows[0]?.value ?? 0),
      db
        .select({ value: count() })
        .from(vouchers)
        .where(isNotNull(vouchers.redeemedPurchaseId))
        .then((rows) => rows[0]?.value ?? 0),
      db
        .select({ value: count() })
        .from(vouchers)
        .where(and(isNull(vouchers.redeemedPurchaseId), lt(vouchers.expiresAt, sql`CURRENT_DATE`)))
        .then((rows) => rows[0]?.value ?? 0),
      db
        .select({ amount: sum(vouchers.discountApplied) })
        .from(vouchers)
        .then((rows) => Number(rows[0]?.amount ?? 0)),
    ])

    return ok(
      { issued, redeemed, expired, available: issued - redeemed - expired, totalDiscount: totals },
      { en: "Voucher statistics retrieved", vi: "Lấy thống kê voucher thành công" },
    )
  } catch (error) {
    logger.error("Error building voucher statistics", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

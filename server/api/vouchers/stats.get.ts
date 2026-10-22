import { getVoucherTotals } from "~/server/repository/vouchers"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
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
export default defineApiHandler(async (event): Promise<ApiResponse<VoucherStats>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can view voucher statistics",
    vi: "Chỉ quản trị viên mới có thể xem thống kê voucher",
  })
  if (!auth.ok) return auth.error

  const { issued, redeemed, expired, totalDiscount } = await getVoucherTotals()

  return ok(
    { issued, redeemed, expired, available: issued - redeemed - expired, totalDiscount },
    { en: "Voucher statistics retrieved", vi: "Lấy thống kê voucher thành công" },
  )
})

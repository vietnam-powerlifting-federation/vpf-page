import { deleteUnredeemedVoucher, findVoucherByCode } from "~/server/repository/vouchers"
import { logger } from "~/lib/logger/logger"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { VoucherRevoked } from "~/types/vouchers"

/**
 * Revoke an unredeemed voucher. A redeemed voucher is part of a purchase's price
 * history and must not vanish — deleting the athlete cascades it away instead.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<VoucherRevoked>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can revoke vouchers",
    vi: "Chỉ quản trị viên mới có thể thu hồi voucher",
  })
  if (!auth.ok) return auth.error

  const code = getRouterParam(event, "code")
  if (!code) return fail(event, 400, MSG.invalidInput)

  const voucher = await findVoucherByCode(code)

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
  const deleted = await deleteUnredeemedVoucher(voucher.voucherId)

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
})

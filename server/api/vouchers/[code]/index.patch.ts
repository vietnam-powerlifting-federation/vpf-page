import { findVoucherByCode, updateUnredeemedVoucher } from "~/server/repository/vouchers"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/domain/vouchers"
import { UpdateVoucherSchema } from "~/lib/zod/schemas/voucher.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { Voucher } from "~/types/vouchers"

/**
 * Edit an issued voucher (§8).
 *
 * Before this, fixing an expiry date meant delete-and-recreate, which loses the
 * code the athlete was already given.
 *
 * The `redeemedPurchaseId IS NULL` predicate on the UPDATE itself — not just the
 * read above it — is what closes the race between checking and writing, matching
 * the pattern the delete path already uses.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<Voucher>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can edit vouchers",
    vi: "Chỉ quản trị viên mới có thể sửa voucher",
  })
  if (!auth.ok) return auth.error

  const code = getRouterParam(event, "code")
  if (!code) return fail(event, 400, MSG.invalidInput)

  const validated = await readZodBody(event, UpdateVoucherSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const patch = Object.fromEntries(
    Object.entries(validated.data).filter(([, value]) => value !== undefined),
  )
  if (Object.keys(patch).length === 0) return fail(event, 400, MSG.invalidInput)

  if (typeof patch.expiresAt === "string" && patch.expiresAt < todayIso()) {
    return fail(event, 400, {
      en: "Expiry date cannot be in the past",
      vi: "Ngày hết hạn không thể ở quá khứ",
    })
  }

  const existing = await findVoucherByCode(code)

  if (!existing) return fail(event, 404, { en: "Voucher not found", vi: "Không tìm thấy voucher" })

  if (existing.redeemedPurchaseId !== null) {
    return fail(event, 409, {
      en: "This voucher has already been used and can no longer be edited",
      vi: "Voucher này đã được sử dụng nên không thể chỉnh sửa",
    })
  }

  const updated = await updateUnredeemedVoucher(code, patch)

  if (!updated) {
    return fail(event, 409, {
      en: "That voucher was used while you were editing it",
      vi: "Voucher đã được sử dụng trong lúc bạn chỉnh sửa",
    })
  }

  logger.info("Voucher updated", { code, updatedBy: auth.user.vpfId, fields: Object.keys(patch) })

  return ok(
    {
      voucherId: updated.voucherId,
      code: updated.code,
      type: updated.type,
      discountKind: updated.discountKind,
      discountValue: updated.discountValue,
      expiresAt: updated.expiresAt,
      status: voucherStatus(updated),
      redeemedPurchaseId: updated.redeemedPurchaseId,
      redeemedAt: updated.redeemedAt,
      discountApplied: updated.discountApplied,
      redeemedRefCode: null,
      note: updated.note,
      createdAt: updated.createdAt,
    },
    { en: "Voucher updated", vi: "Đã cập nhật voucher" },
  )
})

import { findAthleteNameAndEmail } from "~/server/repository/violations"
import { insertVoucher } from "~/server/repository/vouchers"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/domain/vouchers"
import { CreateVoucherSchema } from "~/lib/zod/schemas/voucher.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"
import { generateUniqueVoucherCode } from "~/server/service/vouchers"
import type { ApiResponse } from "~/types/api"
import type { Voucher } from "~/types/vouchers"

/** Issue a voucher to an athlete. The code and `createdBy` come from the server. */
export default defineApiHandler(async (event): Promise<ApiResponse<Voucher>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can issue vouchers",
    vi: "Chỉ quản trị viên mới có thể phát hành voucher",
  })
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const validated = await readZodBody(event, CreateVoucherSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const { vpfId, type, discountKind, discountValue, expiresAt, note } = validated.data

  const targetUser = await findAthleteNameAndEmail(vpfId)

  if (!targetUser) return fail(event, 404, MSG.athleteNotFound)

  if (expiresAt < todayIso()) {
    return fail(event, 400, {
      en: "Expiry date cannot be in the past",
      vi: "Ngày hết hạn không thể ở quá khứ",
    })
  }

  const code = await generateUniqueVoucherCode()

  const inserted = await insertVoucher({
    code,
    vpfId,
    type,
    discountKind,
    discountValue,
    expiresAt,
    note: note ?? null,
    createdBy: currentUser.vpfId,
  })

  if (!inserted) {
    logger.error("Failed to insert voucher", { vpfId, type })
    return fail(event, 500, { en: "Failed to create voucher", vi: "Không thể tạo voucher" })
  }

  logger.info("Voucher issued", {
    voucherId: inserted.voucherId,
    code,
    vpfId,
    type,
    discountKind,
    discountValue,
    issuedBy: currentUser.vpfId,
  })

  return ok(
    {
      voucherId: inserted.voucherId,
      code: inserted.code,
      type: inserted.type,
      discountKind: inserted.discountKind,
      discountValue: inserted.discountValue,
      expiresAt: inserted.expiresAt,
      status: voucherStatus(inserted),
      redeemedPurchaseId: inserted.redeemedPurchaseId,
      redeemedAt: inserted.redeemedAt,
      discountApplied: inserted.discountApplied,
      redeemedRefCode: null,
      note: inserted.note,
      createdAt: inserted.createdAt,
    },
    { en: "Voucher issued successfully", vi: "Phát hành voucher thành công" },
  )
})

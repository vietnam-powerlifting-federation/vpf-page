import { and, eq, isNull } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/utils/vouchers"
import { UpdateVoucherSchema } from "~/lib/zod/schemas/voucher.schema"
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
export default defineEventHandler(async (event): Promise<ApiResponse<Voucher>> => {
  try {
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

    const existing = await db
      .select({ voucherId: vouchers.voucherId, redeemedPurchaseId: vouchers.redeemedPurchaseId })
      .from(vouchers)
      .where(eq(vouchers.code, code))
      .limit(1)
      .then((rows) => rows[0])

    if (!existing) return fail(event, 404, { en: "Voucher not found", vi: "Không tìm thấy voucher" })

    if (existing.redeemedPurchaseId !== null) {
      return fail(event, 409, {
        en: "This voucher has already been used and can no longer be edited",
        vi: "Voucher này đã được sử dụng nên không thể chỉnh sửa",
      })
    }

    const updated = await db
      .update(vouchers)
      .set(patch)
      .where(and(eq(vouchers.code, code), isNull(vouchers.redeemedPurchaseId)))
      .returning()
      .then((rows) => rows[0])

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
  } catch (error) {
    logger.error("Error updating voucher", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

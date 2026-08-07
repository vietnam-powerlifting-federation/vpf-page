import { gte, inArray, isNull, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { todayIso } from "~/lib/utils/vouchers"
import { BulkVoucherSchema } from "~/lib/zod/schemas/voucher.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { generateUniqueVoucherCode } from "~/server/utils/voucher-helpers"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"

type BulkResult = {
  issued: number
  /** Athletes named in the request that do not exist; skipped rather than failing the batch. */
  unknownVpfIds: string[]
  sampleCodes: string[]
}

/**
 * Issue one voucher each to many athletes (§8).
 *
 * Every athlete gets their own unique code rather than sharing one: a voucher is
 * single-use and per-athlete by design, and a shared code could not be either.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<BulkResult>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can issue vouchers",
      vi: "Chỉ quản trị viên mới có thể phát hành voucher",
    })
    if (!auth.ok) return auth.error

    const validated = await readZodBody(event, BulkVoucherSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { vpfIds, audience, type, discountKind, discountValue, expiresAt, note } = validated.data

    if (expiresAt < todayIso()) {
      return fail(event, 400, {
        en: "Expiry date cannot be in the past",
        vi: "Ngày hết hạn không thể ở quá khứ",
      })
    }

    const recipients = await db
      .select({ vpfId: users.vpfId })
      .from(users)
      .where(audience === "active_members"
        ? or(isNull(users.vpfMembershipExpiresAt), gte(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`))
        : inArray(users.vpfId, vpfIds!))

    const found = new Set(recipients.map((row) => row.vpfId))
    const unknownVpfIds = (vpfIds ?? []).filter((vpfId) => !found.has(vpfId))

    if (recipients.length === 0) {
      return fail(event, 400, {
        en: "No matching athletes to issue to",
        vi: "Không có vận động viên phù hợp để phát hành",
      })
    }

    // Codes are generated up front so the whole batch is one insert: a partial
    // batch would leave staff unsure who had been given what.
    const rows = []
    for (const recipient of recipients) {
      rows.push({
        code: await generateUniqueVoucherCode(),
        vpfId: recipient.vpfId,
        type,
        discountKind,
        discountValue,
        expiresAt,
        note: note ?? null,
        createdBy: auth.user.vpfId,
      })
    }

    const inserted = await db.insert(vouchers).values(rows).returning({ code: vouchers.code })

    logger.info("Vouchers issued in bulk", {
      issued: inserted.length,
      type,
      audience: audience ?? "explicit",
      issuedBy: auth.user.vpfId,
    })

    return ok(
      {
        issued: inserted.length,
        unknownVpfIds,
        sampleCodes: inserted.slice(0, 5).map((row) => row.code),
      },
      {
        en: `${inserted.length} vouchers issued`,
        vi: `Đã phát hành ${inserted.length} voucher`,
      },
    )
  } catch (error) {
    logger.error("Error bulk issuing vouchers", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

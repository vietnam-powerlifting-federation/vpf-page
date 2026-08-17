import { and, desc, eq, gte, isNull, isNotNull } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { todayIso, voucherStatus } from "~/lib/utils/vouchers"
import { VoucherListQuerySchema } from "~/lib/zod/schemas/voucher.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { VoucherWithUser } from "~/types/vouchers"

/**
 * An athlete's own vouchers by default. An admin may also pass `vpfId` to view
 * any single athlete's vouchers, or omit it to list every athlete's — the
 * admin management page uses the latter. A non-admin passing a `vpfId` other
 * than their own is rejected outright, never silently ignored.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<VoucherWithUser[]>> => {
  try {
    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user
    const isAdmin = currentUser.role === "admin"

    const parsed = VoucherListQuerySchema.safeParse(getQuery(event))
    if (!parsed.success) return fail(event, 400, MSG.invalidInput)
    const { type, available, vpfId, redeemed } = parsed.data

    if (vpfId && !isAdmin && vpfId !== currentUser.vpfId) {
      return fail(event, 403, {
        en: "You may only view your own vouchers",
        vi: "Bạn chỉ có thể xem voucher của mình",
      })
    }

    // Non-admins are always scoped to themselves; an admin with no vpfId sees everyone's.
    const scopedVpfId = isAdmin ? vpfId : currentUser.vpfId

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
          scopedVpfId ? eq(vouchers.vpfId, scopedVpfId) : undefined,
          type ? eq(vouchers.type, type) : undefined,
          // "available" is what a purchase form should offer: unredeemed and unexpired.
          available ? isNull(vouchers.redeemedPurchaseId) : undefined,
          available ? gte(vouchers.expiresAt, today) : undefined,
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
    logger.error("Error listing vouchers", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

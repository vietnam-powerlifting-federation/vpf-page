import { listVouchers } from "~/server/repository/vouchers"
import { todayIso, voucherStatus } from "~/lib/domain/vouchers"
import { VoucherListQuerySchema } from "~/lib/zod/schemas/voucher.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
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
export default defineApiHandler(async (event): Promise<ApiResponse<VoucherWithUser[]>> => {
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

  const rows = await listVouchers({ vpfId: scopedVpfId, type, available, redeemed }, today)

  const data: VoucherWithUser[] = rows.map((row) => ({
    ...row,
    redeemedRefCode: row.redeemedRefCode ?? null,
    status: voucherStatus(row, today),
  }))

  return ok(data, { en: "Vouchers retrieved", vi: "Lấy danh sách voucher thành công" })
})

import { z } from "zod"
import { listPurchasesForAdmin, listVouchersForPurchases } from "~/server/repository/purchases"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { buildQrUrl } from "~/server/service/purchase-codes"
import type { ApiResponse } from "~/types/api"
import type { AdminPurchase } from "~/types/purchases"

/**
 * Every athlete's purchases, for the admin finance screen (§7.1).
 *
 * `GET /api/athletes/[id]/purchases` is athlete-scoped with no admin-wide view, and
 * `PATCH /api/purchases/[refCode]/approve` approves *by ref code* — so before this
 * existed, approving a transfer meant already knowing a six-digit code that only
 * appeared in the athlete's own view or the database.
 */
const AdminPurchaseQuerySchema = z.object({
  status: z.enum(["pending", "active", "expired", "cancelled"]).optional(),
  type: z.enum(["vip", "vpf_membership", "competition"]).optional(),
  vpfId: z.string().trim().optional(),
  meetId: z.coerce.number().int().optional(),
  /** Ref code, athlete name or email. */
  search: z.string().trim().min(1).max(120).optional(),
  createdFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Reconciliation wants oldest-first: the pending queue is worked by age (§7.2). */
  order: z.enum(["newest", "oldest"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export default defineApiHandler(async (event): Promise<ApiResponse<AdminPurchase[]>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can view all purchases",
    vi: "Chỉ quản trị viên mới có thể xem tất cả giao dịch",
  })
  if (!auth.ok) return auth.error

  const parsed = AdminPurchaseQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) return fail(event, 400, MSG.invalidInput)
  const query = parsed.data

  const rows = await listPurchasesForAdmin(query)

  // Vouchers applied to these purchases, so finance can see why an amount is
  // lower than the list price without opening the voucher screen.
  const purchaseIds = rows.map((row) => row.purchaseId)
  const voucherRows = await listVouchersForPurchases(purchaseIds)

  const vouchersByPurchase = new Map<number, AdminPurchase["vouchers"]>()
  for (const voucher of voucherRows) {
    if (voucher.redeemedPurchaseId === null) continue
    const list = vouchersByPurchase.get(voucher.redeemedPurchaseId) ?? []
    list.push({ code: voucher.code, type: voucher.type, discount: voucher.discountApplied ?? 0 })
    vouchersByPurchase.set(voucher.redeemedPurchaseId, list)
  }

  const data: AdminPurchase[] = rows.map((row) => ({
    purchaseId: row.purchaseId,
    vpfId: row.vpfId,
    refCode: row.refCode,
    /** The memo the athlete was told to put on the transfer. */
    expectedMemo: `SEVQR ${row.refCode}`,
    type: row.type,
    amount: row.amount,
    status: row.status,
    createdAt: row.createdAt,
    confirmedAt: row.confirmedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    approvedBy: row.approvedBy ?? null,
    userName: row.userName,
    userEmail: row.userEmail ?? null,
    meetId: row.meetId ?? null,
    meetName: row.meetName ?? null,
    division: row.division ?? null,
    weightClass: row.weightClass ?? null,
    sex: row.sex ?? null,
    mediaPlus: row.mediaPlus ?? null,
    vipDurationMonths: row.vipDurationMonths ?? null,
    membershipYear: row.membershipYear ?? null,
    vouchers: vouchersByPurchase.get(row.purchaseId) ?? [],
    ...(row.status === "pending" ? { qrUrl: buildQrUrl(row.refCode, row.amount) } : {}),
  }))

  return ok(data, { en: "Purchases retrieved", vi: "Lấy danh sách giao dịch thành công" })
})

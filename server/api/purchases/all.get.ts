import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionPurchaseMetadata,
  meets,
  purchases,
  users,
  vipPurchaseMetadata,
  vouchers,
  vpfMembershipPurchaseMetadata,
} from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { buildVietQrUrl } from "~/server/utils/purchase-helpers"
import type { ApiResponse } from "~/types/api"
import type { AdminPurchase } from "~/types/purchases"

/**
 * Every athlete's purchases, for the admin finance screen (§7.1).
 *
 * `GET /api/purchases` is athlete-scoped with no admin branch, and
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

export default defineEventHandler(async (event): Promise<ApiResponse<AdminPurchase[]>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can view all purchases",
      vi: "Chỉ quản trị viên mới có thể xem tất cả giao dịch",
    })
    if (!auth.ok) return auth.error

    const parsed = AdminPurchaseQuerySchema.safeParse(getQuery(event))
    if (!parsed.success) return fail(event, 400, MSG.invalidInput)
    const query = parsed.data

    const rows = await db
      .select({
        purchaseId: purchases.purchaseId,
        vpfId: purchases.vpfId,
        type: purchases.type,
        refCode: purchases.refCode,
        amount: purchases.amount,
        status: purchases.status,
        createdAt: purchases.createdAt,
        confirmedAt: purchases.confirmedAt,
        cancelledAt: purchases.cancelledAt,
        approvedBy: purchases.approvedBy,
        userName: users.fullName,
        userEmail: users.email,
        meetId: competitionPurchaseMetadata.meetId,
        meetName: meets.meetName,
        division: competitionPurchaseMetadata.division,
        weightClass: competitionPurchaseMetadata.weightClass,
        sex: competitionPurchaseMetadata.sex,
        mediaPlus: competitionPurchaseMetadata.mediaPlus,
        vipDurationMonths: vipPurchaseMetadata.durationMonths,
        membershipYear: vpfMembershipPurchaseMetadata.membershipYear,
      })
      .from(purchases)
      .innerJoin(users, eq(users.vpfId, purchases.vpfId))
      .leftJoin(competitionPurchaseMetadata, eq(competitionPurchaseMetadata.purchaseId, purchases.purchaseId))
      .leftJoin(meets, eq(meets.meetId, competitionPurchaseMetadata.meetId))
      .leftJoin(vipPurchaseMetadata, eq(vipPurchaseMetadata.purchaseId, purchases.purchaseId))
      .leftJoin(vpfMembershipPurchaseMetadata, eq(vpfMembershipPurchaseMetadata.purchaseId, purchases.purchaseId))
      .where(and(
        query.status ? eq(purchases.status, query.status) : undefined,
        query.type ? sql`${query.type} = ANY(${purchases.type})` : undefined,
        query.vpfId ? eq(purchases.vpfId, query.vpfId) : undefined,
        query.meetId ? eq(competitionPurchaseMetadata.meetId, query.meetId) : undefined,
        query.createdFrom ? gte(purchases.createdAt, sql`${query.createdFrom}::timestamptz`) : undefined,
        query.createdTo ? lte(purchases.createdAt, sql`(${query.createdTo}::date + 1)::timestamptz`) : undefined,
        query.search
          ? sql`(${purchases.refCode} ILIKE ${`%${query.search.replace(/^VPF/i, "")}%`}
              OR ${ilike(users.fullName, `%${query.search}%`)}
              OR ${ilike(users.email, `%${query.search}%`)})`
          : undefined,
      ))
      .orderBy(query.order === "oldest" ? asc(purchases.createdAt) : desc(purchases.createdAt))
      .limit(query.limit)

    // Vouchers applied to these purchases, so finance can see why an amount is
    // lower than the list price without opening the voucher screen.
    const purchaseIds = rows.map((row) => row.purchaseId)
    const voucherRows = purchaseIds.length === 0
      ? []
      : await db
        .select({
          redeemedPurchaseId: vouchers.redeemedPurchaseId,
          code: vouchers.code,
          type: vouchers.type,
          discountApplied: vouchers.discountApplied,
        })
        .from(vouchers)
        .where(inArray(vouchers.redeemedPurchaseId, purchaseIds))

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
      expectedMemo: `VPF${row.refCode}`,
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
      ...(row.status === "pending" ? { qrUrl: buildVietQrUrl(row.refCode, row.amount) } : {}),
    }))

    return ok(data, { en: "Purchases retrieved", vi: "Lấy danh sách giao dịch thành công" })
  } catch (error) {
    logger.error("Error listing all purchases", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

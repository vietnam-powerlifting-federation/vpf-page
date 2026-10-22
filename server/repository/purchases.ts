import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { redeemVouchers, releaseVouchers, type VoucherRedemption } from "~/server/service/vouchers"
import {
  competitionPurchaseMetadata,
  meets,
  purchases,
  users,
  vipPurchaseMetadata,
  vouchers,
  vpfMembershipPurchaseMetadata,
} from "~/lib/external/drizzle/migrations/schema"

/** The columns a purchase is summarised by; the metadata tables are joined in separately. */
const purchaseSummarySelect = {
  purchaseId: purchases.purchaseId,
  vpfId: purchases.vpfId,
  type: purchases.type,
  refCode: purchases.refCode,
  amount: purchases.amount,
  status: purchases.status,
  createdAt: purchases.createdAt,
  confirmedAt: purchases.confirmedAt,
  cancelledAt: purchases.cancelledAt,
}

export type PurchaseSummary = Awaited<ReturnType<typeof listPurchasesForAthlete>>[number]

/** One athlete's purchase history, oldest first. */
export async function listPurchasesForAthlete(vpfId: string) {
  return db
    .select(purchaseSummarySelect)
    .from(purchases)
    .where(eq(purchases.vpfId, vpfId))
    .orderBy(purchases.createdAt)
}

export async function findPurchaseByRefCode(refCode: string) {
  return db
    .select(purchaseSummarySelect)
    .from(purchases)
    .where(eq(purchases.refCode, refCode))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export type AdminPurchaseFilters = {
  status?: string
  type?: string
  vpfId?: string
  meetId?: number
  createdFrom?: string
  createdTo?: string
  search?: string
  order?: "oldest" | "newest"
  limit: number
}

/**
 * The finance view: every purchase joined to the athlete and to whichever
 * metadata table matches its type. `purchases.type` is an array column, hence
 * the `= ANY(...)` rather than an equality test.
 */
export async function listPurchasesForAdmin(filters: AdminPurchaseFilters) {
  return db
    .select({
      ...purchaseSummarySelect,
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
      filters.status ? eq(purchases.status, filters.status as never) : undefined,
      filters.type ? sql`${filters.type} = ANY(${purchases.type})` : undefined,
      filters.vpfId ? eq(purchases.vpfId, filters.vpfId) : undefined,
      filters.meetId ? eq(competitionPurchaseMetadata.meetId, filters.meetId) : undefined,
      filters.createdFrom ? gte(purchases.createdAt, sql`${filters.createdFrom}::timestamptz`) : undefined,
      filters.createdTo ? lte(purchases.createdAt, sql`(${filters.createdTo}::date + 1)::timestamptz`) : undefined,
      filters.search
        ? sql`(${purchases.refCode} ILIKE ${`%${filters.search.replace(/^VPF/i, "")}%`}
            OR ${ilike(users.fullName, `%${filters.search}%`)}
            OR ${ilike(users.email, `%${filters.search}%`)})`
        : undefined,
    ))
    .orderBy(filters.order === "oldest" ? asc(purchases.createdAt) : desc(purchases.createdAt))
    .limit(filters.limit)
}

/** Vouchers redeemed against the given purchases, so finance can see why an amount is below list price. */
export async function listVouchersForPurchases(purchaseIds: number[]) {
  if (purchaseIds.length === 0) return []
  return db
    .select({
      redeemedPurchaseId: vouchers.redeemedPurchaseId,
      code: vouchers.code,
      type: vouchers.type,
      discountApplied: vouchers.discountApplied,
    })
    .from(vouchers)
    .where(inArray(vouchers.redeemedPurchaseId, purchaseIds))
}

/**
 * Cancel a pending purchase and hand its vouchers back to the athlete.
 *
 * One transaction, and the UPDATE re-asserts `status = 'pending'`: a purchase
 * approved between the read and the write must not be silently cancelled, and
 * the vouchers it consumed must not be released while the approval stands.
 */
export async function cancelPendingPurchase(
  refCode: string,
  purchaseId: number,
  cancelledAt: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({ status: "cancelled", cancelledAt })
      .where(and(eq(purchases.refCode, refCode), eq(purchases.status, "pending")))

    await releaseVouchers(tx, purchaseId)
  })
}

/**
 * Create a competition registration: the purchase, its metadata, any membership
 * owed, the athlete's equipment settings, and the voucher redemptions.
 *
 * All in one transaction because a half-written registration is worse than none:
 * a purchase with no metadata is unattributable, and a redeemed voucher with no
 * purchase is simply destroyed. `redeemVouchers` returning false means someone
 * spent the voucher first, and rolling back is the only correct answer — issuing
 * a discounted QR against an already-spent voucher would undercharge.
 */
export async function createCompetitionRegistration(params: {
  vpfId: string
  type: string[]
  refCode: string
  amount: number
  competitionMetadata: Omit<typeof competitionPurchaseMetadata.$inferInsert, "purchaseId">
  membershipYear: number | null
  athletePatch: Record<string, unknown>
  redemptions: VoucherRedemption[]
}): Promise<{ purchaseId: number }> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(purchases)
      .values({
        vpfId: params.vpfId,
        type: params.type as never,
        refCode: params.refCode,
        amount: params.amount,
        status: "pending",
      })
      .returning({ purchaseId: purchases.purchaseId })

    await tx.insert(competitionPurchaseMetadata).values({
      ...params.competitionMetadata,
      purchaseId: inserted.purchaseId,
    })

    if (params.membershipYear !== null) {
      await tx.insert(vpfMembershipPurchaseMetadata).values({
        purchaseId: inserted.purchaseId,
        membershipYear: params.membershipYear,
      })
    }

    if (Object.keys(params.athletePatch).length > 0) {
      await tx.update(users).set(params.athletePatch).where(eq(users.vpfId, params.vpfId))
    }

    if (!(await redeemVouchers(tx, params.redemptions, inserted.purchaseId))) {
      tx.rollback()
    }

    return inserted
  })
}

/** The VIP/membership equivalent of the above; same rollback-on-lost-race rule. */
export async function createVipPurchase(params: {
  vpfId: string
  type: string[]
  refCode: string
  amount: number
  durationMonths: number
  redemptions: VoucherRedemption[]
}): Promise<{ purchaseId: number; createdAt: string }> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(purchases)
      .values({
        vpfId: params.vpfId,
        type: params.type as never,
        refCode: params.refCode,
        amount: params.amount,
        status: "pending",
      })
      .returning({ purchaseId: purchases.purchaseId, createdAt: purchases.createdAt })

    await tx.insert(vipPurchaseMetadata).values({
      purchaseId: inserted.purchaseId,
      durationMonths: params.durationMonths,
    })

    if (!(await redeemVouchers(tx, params.redemptions, inserted.purchaseId))) {
      tx.rollback()
    }

    return inserted
  })
}

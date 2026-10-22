import { and, count, desc, eq, gte, isNotNull, isNull, lt, sql, sum } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vouchers } from "~/lib/external/drizzle/migrations/schema"
import type { VoucherType } from "~/types/vouchers"

export type VoucherListFilters = {
  /** Restricts to one athlete. Undefined means every athlete, which only an admin reaches. */
  vpfId?: string
  type?: VoucherType
  /** What a purchase form should offer: unredeemed and unexpired. */
  available?: boolean
  redeemed?: boolean
}

export type VoucherRow = Awaited<ReturnType<typeof listVouchers>>[number]

export async function listVouchers(filters: VoucherListFilters, today: string) {
  return db
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
        filters.vpfId ? eq(vouchers.vpfId, filters.vpfId) : undefined,
        filters.type ? eq(vouchers.type, filters.type) : undefined,
        filters.available ? isNull(vouchers.redeemedPurchaseId) : undefined,
        filters.available ? gte(vouchers.expiresAt, today) : undefined,
        filters.redeemed === true ? isNotNull(vouchers.redeemedPurchaseId) : undefined,
        filters.redeemed === false ? isNull(vouchers.redeemedPurchaseId) : undefined,
      ),
    )
    .orderBy(desc(vouchers.createdAt))
}

export async function findVoucherByCode(code: string) {
  return db
    .select({
      voucherId: vouchers.voucherId,
      code: vouchers.code,
      vpfId: vouchers.vpfId,
      redeemedPurchaseId: vouchers.redeemedPurchaseId,
    })
    .from(vouchers)
    .where(eq(vouchers.code, code))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/**
 * Both mutations below re-assert `redeemedPurchaseId IS NULL` in the WHERE
 * clause rather than trusting the row just read. A voucher can be redeemed
 * between the read and the write, and a spent voucher must not be editable or
 * deletable — the discount it granted is already recorded against a purchase.
 */
export async function deleteUnredeemedVoucher(voucherId: number) {
  return db
    .delete(vouchers)
    .where(and(eq(vouchers.voucherId, voucherId), isNull(vouchers.redeemedPurchaseId)))
    .returning({ voucherId: vouchers.voucherId })
}

export async function updateUnredeemedVoucher(
  code: string,
  patch: Partial<typeof vouchers.$inferInsert>,
) {
  return db
    .update(vouchers)
    .set(patch)
    .where(and(eq(vouchers.code, code), isNull(vouchers.redeemedPurchaseId)))
    .returning()
    .then((rows) => rows[0] ?? null)
}

export type VoucherTotals = {
  issued: number
  redeemed: number
  expired: number
  totalDiscount: number
}

/** "Used" wins over "expired", matching the precedence `voucherStatus` applies athlete-side. */
export async function getVoucherTotals(): Promise<VoucherTotals> {
  const [issued, redeemed, expired, totalDiscount] = await Promise.all([
    db.select({ value: count() }).from(vouchers).then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(vouchers)
      .where(isNotNull(vouchers.redeemedPurchaseId))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(vouchers)
      .where(and(isNull(vouchers.redeemedPurchaseId), lt(vouchers.expiresAt, sql`CURRENT_DATE`)))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ amount: sum(vouchers.discountApplied) })
      .from(vouchers)
      .then((rows) => Number(rows[0]?.amount ?? 0)),
  ])

  return { issued, redeemed, expired, totalDiscount }
}

/** One insert for the whole batch: a partial batch leaves staff unsure who was given what. */
export async function insertVouchers(rows: (typeof vouchers.$inferInsert)[]) {
  return db.insert(vouchers).values(rows).returning({ code: vouchers.code })
}

export async function insertVoucher(values: typeof vouchers.$inferInsert) {
  return db.insert(vouchers).values(values).returning().then((rows) => rows[0])
}

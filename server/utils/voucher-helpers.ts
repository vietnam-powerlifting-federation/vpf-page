import { and, eq, gte, inArray, isNull } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { vouchers } from "~/lib/external/drizzle/migrations/schema"
import { todayIso, type DiscountRule, type LineItems, type VoucherTotals } from "~/lib/utils/vouchers"
import type { I18nMessage } from "~/server/utils/api-response"
import type { PurchaseType, VoucherDiscountKind } from "~/types/union-types"
import type { AppliedVoucher } from "~/types/vouchers"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * A voucher that passed validation. It is a `DiscountRule`, so it feeds straight
 * into `computeVoucherTotals` — the discount itself is resolved there, never here,
 * so the server and client never drift.
 */
export type ResolvedVoucher = DiscountRule & {
  voucherId: number
  code: string
  type: PurchaseType
  discountKind: VoucherDiscountKind
}

/** A resolved voucher paired with the VND it actually took off, ready to freeze. */
export type VoucherRedemption = {
  voucherId: number
  discount: number
}

export type VoucherResolution =
  | { ok: true; vouchers: ResolvedVoucher[] }
  | { ok: false; statusCode: number; message: I18nMessage }

/**
 * Ownership is deliberately indistinguishable from non-existence: a voucher is
 * per-athlete, so someone else's code simply does not exist for you. Telling the
 * two apart would let anyone enumerate valid codes.
 */
const VOUCHER_NOT_FOUND: I18nMessage = { en: "Voucher not found", vi: "Không tìm thấy voucher" }

/** Unambiguous alphabet — no O/0 or I/1, since codes get read aloud and retyped. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomSegment(length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

/** Random unique human-readable code, e.g. `VPF-K7Q2-M4XP`. */
export async function generateUniqueVoucherCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `VPF-${randomSegment(4)}-${randomSegment(4)}`
    const existing = await db
      .select({ code: vouchers.code })
      .from(vouchers)
      .where(eq(vouchers.code, code))
      .limit(1)
      .then((rows) => rows[0])
    if (!existing) return code
  }
  throw new Error("Failed to generate unique voucher code after 10 attempts")
}

/**
 * Validate voucher codes against a purchase being created and resolve each one's
 * discount (voucher system spec §3). Runs the checks in spec order so the athlete
 * gets the most specific reason first.
 *
 * `purchaseTypes` is what the purchase covers; `lineItems` is what each of those
 * types costs before discounts. A voucher only ever touches its own line item.
 */
export async function resolveVouchers(params: {
  codes: string[]
  vpfId: string
  purchaseTypes: PurchaseType[]
  lineItems: LineItems
  today?: string
}): Promise<VoucherResolution> {
  const { codes, vpfId, purchaseTypes, lineItems } = params
  const today = params.today ?? todayIso()

  if (codes.length === 0) return { ok: true, vouchers: [] }

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
    })
    .from(vouchers)
    .where(inArray(vouchers.code, codes))

  const resolved: ResolvedVoucher[] = []
  const seenTypes = new Set<PurchaseType>()

  for (const code of codes) {
    const voucher = rows.find((r) => r.code === code)

    // 1. Exists + 2. Owned — same message and status, on purpose.
    if (!voucher || voucher.vpfId !== vpfId) {
      return { ok: false, statusCode: 404, message: VOUCHER_NOT_FOUND }
    }

    // 3. Unredeemed
    if (voucher.redeemedPurchaseId !== null) {
      return {
        ok: false,
        statusCode: 409,
        message: {
          en: `Voucher ${code} has already been used`,
          vi: `Voucher ${code} đã được sử dụng`,
        },
      }
    }

    // 4. Not expired — inclusive, compared as YYYY-MM-DD strings.
    if (voucher.expiresAt < today) {
      return {
        ok: false,
        statusCode: 400,
        message: {
          en: `Voucher ${code} has expired`,
          vi: `Voucher ${code} đã hết hạn`,
        },
      }
    }

    // 5. Applicable to this purchase
    if (!purchaseTypes.includes(voucher.type)) {
      return {
        ok: false,
        statusCode: 400,
        message: {
          en: `Voucher ${code} is not applicable to this purchase`,
          vi: `Voucher ${code} không áp dụng cho giao dịch này`,
        },
      }
    }

    // 6. Line item is non-zero — never burn a single-use voucher for 0 VND.
    const lineItem = lineItems[voucher.type] ?? 0
    if (lineItem <= 0) {
      return {
        ok: false,
        statusCode: 400,
        message: {
          en: `Voucher ${code} has nothing to discount on this purchase`,
          vi: `Voucher ${code} không có khoản nào để giảm giá trong giao dịch này`,
        },
      }
    }

    // 7. One per type per request — the DB constraint is the backstop; this is the decent message.
    if (seenTypes.has(voucher.type)) {
      return {
        ok: false,
        statusCode: 400,
        message: {
          en: "Only one voucher per item can be applied to a purchase",
          vi: "Chỉ có thể áp dụng một voucher cho mỗi mục trong một giao dịch",
        },
      }
    }
    seenTypes.add(voucher.type)

    resolved.push({
      voucherId: voucher.voucherId,
      code: voucher.code,
      type: voucher.type,
      discountKind: voucher.discountKind,
      discountValue: voucher.discountValue,
    })
  }

  return { ok: true, vouchers: resolved }
}

/**
 * Pair each applied voucher with the discount `computeVoucherTotals` resolved for
 * its line — what gets frozen in `discount_applied` and echoed in the response.
 */
export function collectRedemptions(
  totals: VoucherTotals<ResolvedVoucher>,
): (VoucherRedemption & AppliedVoucher)[] {
  return totals.lines
    .filter((line) => line.voucher !== null)
    .map((line) => ({
      voucherId: line.voucher!.voucherId,
      code: line.voucher!.code,
      type: line.type,
      discount: line.discount,
    }))
}

/**
 * Mark vouchers as redeemed inside the purchase's transaction.
 *
 * The `redeemedPurchaseId IS NULL` guard is what makes concurrent redemption
 * safe: two simultaneous requests with the same code both pass the read-time
 * check in `resolveVouchers`, but only one UPDATE matches. Expiry is re-checked
 * here too, since a request can sit long enough to straddle midnight.
 *
 * Returns false when any voucher failed to lock — the caller must roll back
 * rather than issue a discounted QR against an already-spent voucher.
 */
export async function redeemVouchers(
  tx: Tx,
  redemptions: VoucherRedemption[],
  purchaseId: number,
  today = todayIso(),
): Promise<boolean> {
  const redeemedAt = new Date().toISOString()

  for (const voucher of redemptions) {
    const updated = await tx
      .update(vouchers)
      .set({ redeemedPurchaseId: purchaseId, redeemedAt, discountApplied: voucher.discount })
      .where(
        and(
          eq(vouchers.voucherId, voucher.voucherId),
          isNull(vouchers.redeemedPurchaseId),
          gte(vouchers.expiresAt, today),
        ),
      )
      .returning({ voucherId: vouchers.voucherId })

    if (updated.length !== 1) return false
  }

  return true
}

/**
 * Hand vouchers back to the athlete when a purchase is cancelled or expired.
 * Expiry is re-checked at next use, so a voucher released after its date is
 * simply dead — but it must still be released, or cancelling silently destroys it.
 */
export async function releaseVouchers(tx: Tx, purchaseId: number): Promise<void> {
  await tx
    .update(vouchers)
    .set({ redeemedPurchaseId: null, redeemedAt: null, discountApplied: null })
    .where(eq(vouchers.redeemedPurchaseId, purchaseId))
}

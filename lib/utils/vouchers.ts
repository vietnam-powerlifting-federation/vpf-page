import type { PurchaseType } from "~/types/union-types"
import type { VoucherStatus } from "~/types/vouchers"

/**
 * Pure voucher math, shared by the server (authoritative, at purchase creation)
 * and the client (live preview in the checkout / registration wizard) so both
 * compute identical numbers from one implementation.
 *
 * This module takes plain data and must never import `db`.
 */

/** The minimum a voucher needs to expose for the discount math. */
export type DiscountRule = {
  type: PurchaseType
  discountKind: "fixed" | "percent"
  discountValue: number
}

/**
 * A purchase broken into discountable line items, keyed by purchase type.
 * Media Plus is deliberately absent — it belongs to no type, is never
 * discounted, and is added to the total after discounts.
 */
export type LineItems = Partial<Record<PurchaseType, number>>

export type VoucherLine<R extends DiscountRule = DiscountRule> = {
  type: PurchaseType
  /** The line item before any discount. */
  amount: number
  discount: number
  /** The voucher applied to this line, or null when none was. */
  voucher: R | null
}

export type VoucherTotals<R extends DiscountRule = DiscountRule> = {
  /** Sum of the discountable line items, before discounts and excluding Media Plus. */
  subtotal: number
  lines: VoucherLine<R>[]
  totalDiscount: number
  mediaPlusFee: number
  payable: number
}

/** Today as `YYYY-MM-DD`, the form voucher expiry is compared in. */
export function todayIso(today = new Date()): string {
  return today.toISOString().slice(0, 10)
}

/**
 * The VND a voucher takes off one line item.
 *
 * `fixed` clamps to the line item — a 500,000 voucher on a 350,000 entry fee
 * discounts 350,000, never spilling into another line item or going negative.
 * `percent` floors, so the payable amount is never rounded below the true
 * price and always stays a whole VND.
 */
export function computeDiscount(lineItem: number, rule: DiscountRule): number {
  if (lineItem <= 0) return 0
  return rule.discountKind === "fixed"
    ? Math.min(rule.discountValue, lineItem)
    : Math.floor((lineItem * rule.discountValue) / 100)
}

/**
 * Apply at most one voucher per line item and total the purchase. This is the only
 * place a discount is computed: the server reads `lines[].voucher` back to know
 * what to freeze at redemption, and the client reads the same lines to render the
 * itemised total. Zero-value line items are dropped — nothing to discount or charge.
 */
export function computeVoucherTotals<R extends DiscountRule>(
  lineItems: LineItems,
  rules: R[] = [],
  mediaPlusFee = 0,
): VoucherTotals<R> {
  const lines: VoucherLine<R>[] = (Object.entries(lineItems) as [PurchaseType, number | undefined][])
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([type, amount]) => {
      const voucher = rules.find((r) => r.type === type) ?? null
      return {
        type,
        amount: amount!,
        discount: voucher ? computeDiscount(amount!, voucher) : 0,
        voucher,
      }
    })

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const totalDiscount = lines.reduce((sum, line) => sum + line.discount, 0)

  return { subtotal, lines, totalDiscount, mediaPlusFee, payable: subtotal - totalDiscount + mediaPlusFee }
}

/**
 * Athlete-facing status, checked in this order so a voucher redeemed before it
 * expired reads "used" rather than "expired". Expiry is inclusive: a voucher
 * expiring 2026-07-16 is still good all of 2026-07-16.
 */
export function voucherStatus(
  voucher: { redeemedPurchaseId: number | null; expiresAt: string },
  today = todayIso(),
): VoucherStatus {
  if (voucher.redeemedPurchaseId !== null) return "used"
  return voucher.expiresAt < today ? "expired" : "active"
}

/** Whether a voucher can still be spent — unredeemed and unexpired. */
export function isVoucherAvailable(
  voucher: { redeemedPurchaseId: number | null; expiresAt: string },
  today = todayIso(),
): boolean {
  return voucherStatus(voucher, today) === "active"
}

/** Human-readable discount, e.g. `-20%` or `-100.000₫`. */
export function formatDiscount(rule: DiscountRule): string {
  return rule.discountKind === "percent"
    ? `-${rule.discountValue}%`
    : `-${rule.discountValue.toLocaleString("vi-VN")}₫`
}

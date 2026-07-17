import type { PurchaseType, VoucherDiscountKind } from "~/types/union-types"

/**
 * Athlete-facing voucher state. Derived on the server, never stored — a voucher
 * redeemed before it expired reads "used", not "expired" (see the voucher system spec §6).
 */
export type VoucherStatus = "active" | "expired" | "used"

/** A voucher as returned by GET /api/vouchers. */
export type Voucher = {
  voucherId: number
  code: string
  type: PurchaseType
  discountKind: VoucherDiscountKind
  discountValue: number
  expiresAt: string
  status: VoucherStatus
  redeemedPurchaseId: number | null
  redeemedAt: string | null
  discountApplied: number | null
  /** Ref code of the purchase this voucher was spent on; null while unredeemed. */
  redeemedRefCode: string | null
  note: string | null
  createdAt: string
}

/** A voucher plus its owner's identity, for the admin management list. */
export type VoucherWithUser = Voucher & {
  vpfId: string
  userName: string
  userEmail: string | null
}

export type VoucherRevoked = {
  voucherId: number
  code: string
}

/** A voucher as redeemed against a purchase, with its discount frozen at creation. */
export type AppliedVoucher = {
  code: string
  type: PurchaseType
  discount: number
}

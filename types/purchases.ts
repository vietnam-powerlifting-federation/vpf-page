import type { Division, PurchaseType, PurchaseStatusValue, Sex } from "~/types/union-types"
import type { AppliedVoucher } from "~/types/vouchers"

/**
 * A purchase with its athlete, its resolved line items and any applied vouchers,
 * for the admin finance screen (admin tools spec §7.1).
 *
 * The metadata columns are all nullable because `purchases.type` is an array: one
 * purchase can be a competition entry *and* a membership renewal, and a VIP-only
 * purchase has no meet.
 */
export type AdminPurchase = {
  purchaseId: number
  vpfId: string
  refCode: string
  /** What the bank transfer memo should read — the key to matching a transfer. */
  expectedMemo: string
  type: PurchaseType[]
  amount: number
  status: PurchaseStatusValue
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
  approvedBy: string | null
  userName: string
  userEmail: string | null
  meetId: number | null
  meetName: string | null
  division: Division | null
  weightClass: number | null
  sex: Sex | null
  mediaPlus: boolean | null
  vipDurationMonths: number | null
  membershipYear: number | null
  vouchers: AppliedVoucher[]
  qrUrl?: string
}

export type PurchaseCreated = {
  purchaseId: number
  refCode: string
  type: PurchaseType[]
  plan?: "6months" | "1year"
  /** What the athlete must transfer: post-discount, plus any undiscounted add-on. */
  amount: number
  /** "active" when a voucher covered the full amount — there was nothing to pay. */
  status: "pending" | "active"
  createdAt: string
  /** Absent when `amount` is 0: a VietQR for 0 VND is meaningless. */
  qrUrl?: string
  /** Line-item total before discounts. */
  subtotal: number
  totalDiscount: number
  vouchers: AppliedVoucher[]
}

export type PurchaseCancelled = {
  purchaseId: number
  refCode: string
  status: "cancelled"
  cancelledAt: string
}

export type PurchaseApproved = {
  purchaseId: number
  refCode: string
  status: "active"
  confirmedAt: string
  approvedBy: string
  type: PurchaseType[]
  vipMembershipExpiresAt: string | null
  vpfMembershipExpiresAt: string | null
}

export type PurchaseStatus = {
  purchaseId: number
  refCode: string
  type: PurchaseType[]
  amount: number
  status: PurchaseStatusValue
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
  qrUrl?: string
}

import type { PurchaseType, PurchaseStatusValue } from "~/types/union-types"
import type { AppliedVoucher } from "~/types/vouchers"

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

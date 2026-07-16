import type { PurchaseType, PurchaseStatusValue } from "~/types/union-types"

export type PurchaseCreated = {
  purchaseId: number
  refCode: string
  type: PurchaseType[]
  plan?: "6months" | "1year"
  amount: number
  status: "pending"
  createdAt: string
  qrUrl: string
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

export type PurchaseCreated = {
  purchaseId: number
  refCode: string
  type: "vip" | "vpf_membership" | "competition"
  plan: "6months" | "1year"
  amount: number
  status: "pending"
  createdAt: string
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
  vipMembershipExpiresAt: string
}

export type PurchaseStatus = {
  purchaseId: number
  refCode: string
  type: "vip" | "vpf_membership" | "competition"
  amount: number
  status: "pending" | "active" | "expired" | "cancelled"
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
}

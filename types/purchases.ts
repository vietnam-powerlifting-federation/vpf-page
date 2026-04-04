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

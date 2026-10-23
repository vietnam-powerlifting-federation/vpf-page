import type { PurchaseStatus } from "~/types/purchases"

type TagSeverity = "success" | "info" | "warn" | "danger" | "secondary" | "contrast"

/** Tag colour for each purchase status. */
export const PURCHASE_STATUS_SEVERITY: Record<PurchaseStatus["status"], TagSeverity> = {
  pending: "warn",
  active: "success",
  expired: "secondary",
  cancelled: "danger",
}

/** Tag colour for each status value an admin can see, including expired. */
export const ADMIN_PURCHASE_SEVERITY = { pending: "warn", active: "success", cancelled: "danger", expired: "secondary" } as const

/** Whole hours since a timestamp: reconciliation is worked by age, so a pending row's age matters more than its date. */
export function hoursSince(createdAt: string, now = Date.now()): number {
  return Math.floor((now - new Date(createdAt).getTime()) / 3_600_000)
}

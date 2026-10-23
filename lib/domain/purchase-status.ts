import type { PurchaseStatus } from "~/types/purchases"

type TagSeverity = "success" | "info" | "warn" | "danger" | "secondary" | "contrast"

/** Tag colour for each purchase status. */
export const PURCHASE_STATUS_SEVERITY: Record<PurchaseStatus["status"], TagSeverity> = {
  pending: "warn",
  active: "success",
  expired: "secondary",
  cancelled: "danger",
}

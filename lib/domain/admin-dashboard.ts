import type { AdminDashboard } from "~/types/admin"

/** Nothing needs the staff's attention: no pending verifications, stale purchases, or meets to act on. */
export function isDashboardQueueEmpty(queue: AdminDashboard | null): boolean {
  if (!queue) return true
  return queue.pendingVerifications === 0
    && queue.stalePurchases === 0
    && queue.meetsMissingResults.length === 0
    && queue.meetsClosingSoon.length === 0
    && queue.meetsNeedingEntries.length === 0
}

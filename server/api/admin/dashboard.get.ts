import { getDashboardCounts } from "~/server/repository/dashboard"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
import { requireAdmin } from "~/server/utils/auth-guard"
import type { ApiResponse } from "~/types/api"
import type { AdminDashboard } from "~/types/admin"

/**
 * The action queue behind the admin landing page (§1.2).
 *
 * Deliberately not a set of charts: every number here is something a human has to
 * act on, and every list is short enough to work through. Vanity metrics live in
 * `totals`, below the fold.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<AdminDashboard>> => {
  const auth = requireAdmin(event, {
    en: "Only admins can view the dashboard",
    vi: "Chỉ quản trị viên mới có thể xem bảng điều khiển",
  })
  if (!auth.ok) return auth.error

  const counts = await getDashboardCounts()

  return ok(
    {
      pendingVerifications: counts.pendingVerifications,
      stalePurchases: counts.stale.value,
      stalePurchaseValue: counts.stale.amount,
      meetsMissingResults: counts.missingResults,
      meetsClosingSoon: counts.closingSoon,
      meetsNeedingEntries: counts.needingEntries,
      totals: {
        athletes: counts.athleteTotals.total,
        activeMembers: Number(counts.athleteTotals.active),
        meets: counts.meetTotal,
        pendingValue: counts.pendingValue,
      },
    },
    { en: "Dashboard retrieved", vi: "Lấy bảng điều khiển thành công" },
  )
})

import { isDashboardQueueEmpty } from "~/lib/domain/admin-dashboard"
import type { AdminDashboard } from "~/types/admin"
import type { ApiResponse } from "~/types/api"

/** The admin dashboard: what needs attention now, and the headline totals. */
export function useAdminDashboard() {
  const { data: response, pending } = useFetch<ApiResponse<AdminDashboard>>("/api/admin/dashboard", {
    credentials: "include",
    ignoreResponseError: true,
  })

  const data = computed(() => (response.value?.success ? response.value.data : null))
  const queueEmpty = computed(() => isDashboardQueueEmpty(data.value))

  const stats = computed(() => [
    { label: "admin.dashboard.statAthletes", value: data.value?.totals.athletes ?? 0 },
    { label: "admin.dashboard.statActiveMembers", value: data.value?.totals.activeMembers ?? 0 },
    { label: "admin.dashboard.statMeets", value: data.value?.totals.meets ?? 0 },
    { label: "admin.dashboard.statPendingValue", value: new Intl.NumberFormat("vi-VN").format(data.value?.totals.pendingValue ?? 0) },
  ])

  const stalePurchaseValue = computed(() => new Intl.NumberFormat("vi-VN").format(data.value?.stalePurchaseValue ?? 0))

  return reactive({ data, pending, queueEmpty, stats, stalePurchaseValue })
}

import { hoursSince } from "~/lib/domain/purchase-status"
import type { ApiResponse } from "~/types/api"
import type { AdminPurchase } from "~/types/purchases"
import type { PurchaseStatusValue } from "~/types/union-types"

/** The admin purchases list: filters, approving or cancelling a pending bank transfer. Call with `await`. */
export async function useAdminPurchases() {
  const { t } = useI18n()
  const route = useRoute()
  const notify = useNotify()

  // The dashboard links here with the filter pre-applied (§1.2).
  const search = ref("")
  const status = ref<PurchaseStatusValue | "all">((route.query.status as PurchaseStatusValue) ?? "pending")
  const type = ref<string | null>(null)
  const oldestFirst = ref(route.query.order === "oldest")

  const statusOptions = computed(() => [
    { label: t("admin.purchases.statuses.pending"), value: "pending" },
    { label: t("admin.purchases.statuses.active"), value: "active" },
    { label: t("admin.purchases.statuses.cancelled"), value: "cancelled" },
    { label: t("admin.purchases.filterAll"), value: "all" },
  ])

  const typeOptions = computed(() => [
    { label: t("admin.purchases.types.competition"), value: "competition" },
    { label: t("admin.purchases.types.vpf_membership"), value: "vpf_membership" },
    { label: t("admin.purchases.types.vip"), value: "vip" },
  ])

  const query = computed(() => ({
    ...(status.value === "all" ? {} : { status: status.value }),
    ...(type.value ? { type: type.value } : {}),
    ...(search.value.trim() ? { search: search.value.trim() } : {}),
    order: oldestFirst.value ? "oldest" : "newest",
  }))

  const { data: response, pending, refresh } = await useFetch<ApiResponse<AdminPurchase[]>>("/api/purchases", {
    query,
    credentials: "include",
    ignoreResponseError: true,
  })

  const rows = computed(() => (response.value?.success ? response.value.data : []))

  function age(createdAt: string) {
    const hours = hoursSince(createdAt)
    if (hours < 1) return t("admin.purchases.ageMinutes")
    if (hours < 24) return t("admin.purchases.ageHours", { hours })
    return t("admin.purchases.ageDays", { days: Math.floor(hours / 24) })
  }

  const acting = ref<string | null>(null)

  async function act(purchase: AdminPurchase, action: "approve" | "cancel") {
    acting.value = purchase.refCode
    try {
      const res = await $fetch<ApiResponse<unknown>>(`/api/purchases/${purchase.refCode}/${action}`, {
        method: "PATCH",
        credentials: "include",
        ignoreResponseError: true,
      })
      notify.result(res)
      if (res.success) await refresh()
    } finally {
      acting.value = null
    }
  }

  return reactive({
    search, status, type, oldestFirst, statusOptions, typeOptions,
    rows, pending, age, acting,
    refresh: () => refresh(),
    /** Approval goes through `approvePurchase` and nothing else. */
    approve: (purchase: AdminPurchase) => act(purchase, "approve"),
    cancel: (purchase: AdminPurchase) => act(purchase, "cancel"),
  })
}

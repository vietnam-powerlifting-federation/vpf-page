import type { ApiResponse } from "~/types/api"
import type { IdentityVerification, IdentityVerificationWithUser } from "~/types/verifications"

/** The admin identity-verification queue: filter by status, preview the ID card, approve or reject. Call with `await`. */
export async function useAdminVerifications() {
  const { t } = useI18n()
  const notify = useNotify()

  const statusFilter = ref<"pending" | "approved" | "rejected" | "all">("pending")
  const statusOptions = computed(() => [
    { label: t("adminVerifications.filterPending"), value: "pending" },
    { label: t("adminVerifications.filterApproved"), value: "approved" },
    { label: t("adminVerifications.filterRejected"), value: "rejected" },
    { label: t("adminVerifications.filterAll"), value: "all" },
  ])

  const query = computed(() => (statusFilter.value === "all" ? {} : { status: statusFilter.value }))

  const { data: listResponse, pending, refresh } = await useFetch<ApiResponse<IdentityVerificationWithUser[]>>(
    "/api/verifications",
    { query, credentials: "include", ignoreResponseError: true },
  )

  const rows = computed(() => (listResponse.value?.success ? listResponse.value.data : []))

  const actingId = ref<number | null>(null)

  const imageOpen = ref(false)
  const imageUrl = ref<string | null>(null)
  function openImage(url: string) {
    imageUrl.value = url
    imageOpen.value = true
  }

  const rejectOpen = ref(false)
  const rejectNote = ref("")
  const rejectTarget = ref<IdentityVerificationWithUser | null>(null)
  function openReject(row: IdentityVerificationWithUser) {
    rejectTarget.value = row
    rejectNote.value = ""
    rejectOpen.value = true
  }

  const statusText = (s: string) =>
    s === "approved" ? t("verification.statusApproved") : s === "rejected" ? t("verification.statusRejected") : t("verification.statusPending")
  const statusSeverity = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : "warn")

  async function review(row: IdentityVerificationWithUser, decision: "approved" | "rejected", note?: string) {
    actingId.value = row.id
    try {
      const res = await $fetch(`/api/verifications/${row.id}/review`, {
        method: "PATCH",
        body: { decision, reviewNote: note },
        ignoreResponseError: true,
        credentials: "include",
      }) as ApiResponse<IdentityVerification>
      notify.result(res)
      if (res.success) await refresh()
    } catch (e) {
      notify.failure(e)
    } finally {
      actingId.value = null
    }
  }

  async function confirmReject() {
    if (!rejectTarget.value) return
    await review(rejectTarget.value, "rejected", rejectNote.value.trim() || undefined)
    rejectOpen.value = false
  }

  return reactive({
    statusFilter, statusOptions, rows, pending, actingId,
    imageOpen, imageUrl, openImage,
    rejectOpen, rejectNote, openReject, confirmReject,
    statusText, statusSeverity,
    refresh: () => refresh(),
    approve: (row: IdentityVerificationWithUser) => review(row, "approved"),
  })
}

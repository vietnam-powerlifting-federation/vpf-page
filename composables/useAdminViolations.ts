import { isInForce, outcomeForLevel } from "~/lib/domain/violations"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

/**
 * The admin violations screen: the form that records one, the list of those recorded (filtered),
 * the consequence preview, and lifting one. Call with `await`.
 */
export async function useAdminViolations() {
  const { t } = useI18n()
  const notify = useNotify()

  const currentYear = new Date().getFullYear()

  const form = reactive({
    vpfId: "",
    note: "",
    expireYear: currentYear + 1 as number | null,
    confirmPermanent: false,
  })

  const filterVpfId = ref("")
  const inForceOnly = ref(true)

  const query = computed(() => ({
    ...(filterVpfId.value.trim() ? { vpfId: filterVpfId.value.trim() } : {}),
    ...(inForceOnly.value ? { inForceOnly: "true" } : {}),
  }))

  const { data: response, pending, refresh } = await useFetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
    query,
    credentials: "include",
    ignoreResponseError: true,
  })

  const rows = computed(() => (response.value?.success ? response.value.data : []))

  /**
   * The athlete's level is the count of rows still in force, so recording another
   * one moves them up a step. Say what that step means before it is taken.
   *
   * `isInForce` and `outcomeForLevel` come from the shared domain module rather
   * than being restated here — this preview and the registration endpoint that
   * enforces the ban have to agree, and they cannot if each keeps its own copy.
   */
  const impact = computed(() => {
    const vpfId = form.vpfId.trim()
    if (!vpfId) return null
    const current = rows.value.filter((row) => row.vpfId === vpfId && isInForce(row.expireYear, currentYear)).length
    const projected = current + 1
    if (outcomeForLevel(projected) === "blocked") {
      return {
        severity: "error" as const,
        text: t("admin.violations.impactBlocked", { level: projected, year: form.expireYear ?? currentYear }),
      }
    }
    return { severity: "warn" as const, text: t("admin.violations.impactPledge") }
  })

  const canRecord = computed(() =>
    Boolean(form.vpfId.trim()) && Boolean(form.note.trim()) && (form.expireYear !== null || form.confirmPermanent))

  const saving = ref(false)

  async function record() {
    saving.value = true
    try {
      const res = await $fetch<ApiResponse<UserViolationWithUser>>("/api/violations", {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          vpfId: form.vpfId.trim(),
          note: form.note.trim(),
          expireYear: form.expireYear,
          confirmPermanent: form.confirmPermanent,
        },
      })
      notify.result(res, 5000)
      if (res.success) {
        form.note = ""
        form.confirmPermanent = false
        await refresh()
      }
    } finally {
      saving.value = false
    }
  }

  const liftOpen = ref(false)
  const liftTarget = ref<UserViolationWithUser | null>(null)
  const liftReason = ref("")
  const lifting = ref(false)

  function openLift(row: UserViolationWithUser) {
    liftTarget.value = row
    liftReason.value = ""
    liftOpen.value = true
  }

  async function lift() {
    if (!liftTarget.value) return
    lifting.value = true
    try {
      const res = await $fetch<ApiResponse<unknown>>(`/api/violations/${liftTarget.value.id}`, {
        method: "DELETE",
        credentials: "include",
        ignoreResponseError: true,
        query: { reason: liftReason.value },
      })
      notify.result(res)
      if (res.success) await refresh()
    } finally {
      lifting.value = false
      liftOpen.value = false
    }
  }

  return reactive({
    form, impact, canRecord, saving, record,
    filterVpfId, inForceOnly, rows, pending, refresh: () => refresh(),
    liftOpen, liftReason, lifting, openLift, lift,
  })
}

import { outcomeForLevel } from "~/lib/domain/violations"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
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
    /** At most one: the picker's model is a list. */
    athletes: [] as UserPrivate[],
    note: "",
    expireYear: currentYear + 1 as number | null,
    confirmPermanent: false,
  })

  const filterAthletes = ref<UserPrivate[]>([])
  const inForceOnly = ref(true)

  const query = computed(() => ({
    ...(filterAthletes.value[0] ? { userId: filterAthletes.value[0].userId } : {}),
    ...(inForceOnly.value ? { inForceOnly: "true" } : {}),
  }))

  const { data: response, pending, refresh } = await useFetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
    query,
    credentials: "include",
    ignoreResponseError: true,
  })

  const rows = computed(() => (response.value?.success ? response.value.data : []))

  /**
   * The chosen athlete's current level, asked of the server for that athlete
   * alone. It used to be counted from the list on screen, which is filtered — to
   * another athlete, or to rows in force — so the preview could undercount.
   */
  const targetLevel = ref<number | null>(null)

  async function loadTargetLevel() {
    const userId = form.athletes[0]?.userId
    if (!userId) {
      targetLevel.value = null
      return
    }
    const res = await $fetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
      query: { userId, inForceOnly: "true" },
      credentials: "include",
      ignoreResponseError: true,
    })
    // A slower answer for an athlete no longer chosen must not overwrite the current one.
    if (form.athletes[0]?.userId !== userId) return
    targetLevel.value = res.success ? (res.data[0]?.level ?? 0) : null
  }

  watch(() => form.athletes[0]?.userId, loadTargetLevel)

  /**
   * The athlete's level is the count of rows still in force, so recording another
   * one moves them up a step. Say what that step means before it is taken.
   *
   * The level is computed by the server and `outcomeForLevel` comes from the shared
   * domain module — this preview and the registration endpoint that enforces the
   * ban have to agree, and they cannot if each keeps its own copy.
   */
  const impact = computed(() => {
    if (targetLevel.value === null) return null
    const projected = targetLevel.value + 1
    if (outcomeForLevel(projected) === "blocked") {
      return {
        severity: "error" as const,
        text: t("admin.violations.impactBlocked", { level: projected, year: form.expireYear ?? currentYear }),
      }
    }
    return { severity: "warn" as const, text: t("admin.violations.impactPledge") }
  })

  const canRecord = computed(() =>
    Boolean(form.athletes[0]) && Boolean(form.note.trim()) && (form.expireYear !== null || form.confirmPermanent))

  const saving = ref(false)

  async function record() {
    saving.value = true
    try {
      const res = await $fetch<ApiResponse<UserViolationWithUser>>("/api/violations", {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          userId: form.athletes[0]?.userId,
          note: form.note.trim(),
          expireYear: form.expireYear,
          confirmPermanent: form.confirmPermanent,
        },
      })
      notify.result(res, 5000)
      if (res.success) {
        form.note = ""
        form.confirmPermanent = false
        await Promise.all([refresh(), loadTargetLevel()])
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
      if (res.success) await Promise.all([refresh(), loadTargetLevel()])
    } finally {
      lifting.value = false
      liftOpen.value = false
    }
  }

  return reactive({
    form, impact, canRecord, saving, record,
    filterAthletes, inForceOnly, rows, pending, refresh: () => refresh(),
    liftOpen, liftReason, lifting, openLift, lift,
  })
}

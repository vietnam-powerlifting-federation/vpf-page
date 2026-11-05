import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * A meet's ban list (§5.3): who may not enter it, why, and adding or removing them — several
 * athletes at once when they share a reason (a final's medallists, say). The reason is
 * shown to the athlete verbatim, so it is previewed with the wording the registration wizard uses.
 * Loaded in the browser.
 */
export function useMeetBanList(meetId: ComputedRef<string>, isNew: ComputedRef<boolean>, meetName: () => string) {
  const { t } = useI18n()
  const notify = useNotify()

  const bans = ref<CompetitionBanWithUser[]>([])
  const form = reactive({ athletes: [] as UserPrivate[], reason: "" })
  const canAdd = computed(() => form.athletes.length > 0 && Boolean(form.reason.trim()))
  const saving = ref(false)

  const preview = computed(() => t("competitionRegistration.blockedCompetitionBan", { meet: meetName(), reason: form.reason }))

  async function load() {
    if (isNew.value) return
    const res = await $fetch<ApiResponse<CompetitionBanWithUser[]>>(`/api/meets/${meetId.value}/ban-list`, {
      credentials: "include",
      ignoreResponseError: true,
    })
    bans.value = res.success ? res.data : []
  }

  /** One request per athlete; the ones that failed stay picked so they can be retried. */
  async function add() {
    if (!canAdd.value) return
    saving.value = true
    try {
      const failed: UserPrivate[] = []
      let last: ApiResponse<CompetitionBanWithUser> | null = null
      for (const athlete of form.athletes) {
        last = await $fetch<ApiResponse<CompetitionBanWithUser>>(`/api/meets/${meetId.value}/ban-list`, {
          method: "POST",
          credentials: "include",
          ignoreResponseError: true,
          body: { userId: athlete.userId, reason: form.reason.trim() },
        })
        if (!last.success) {
          notify.apiError(last)
          failed.push(athlete)
        }
      }
      if (last?.success && !failed.length) notify.result(last)
      form.athletes = failed
      if (!failed.length) form.reason = ""
      await load()
    } finally {
      saving.value = false
    }
  }

  async function remove(userId: string) {
    const res = await $fetch<ApiResponse<unknown>>(`/api/meets/${meetId.value}/ban-list/${userId}`, {
      method: "DELETE",
      credentials: "include",
      ignoreResponseError: true,
    })
    notify.result(res)
    if (res.success) await load()
  }

  onMounted(load)

  return reactive({ bans, form, canAdd, saving, preview, add, remove })
}

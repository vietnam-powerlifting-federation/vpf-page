import type { ApiResponse } from "~/types/api"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * A meet's ban list (§5.3): who may not enter it, why, and adding or removing one. The reason is
 * shown to the athlete verbatim, so it is previewed with the wording the registration wizard uses.
 * Loaded in the browser.
 */
export function useMeetBanList(meetId: ComputedRef<string>, isNew: ComputedRef<boolean>, meetName: () => string) {
  const { t } = useI18n()
  const notify = useNotify()

  const bans = ref<CompetitionBanWithUser[]>([])
  const form = reactive({ vpfId: "", reason: "" })
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

  async function add() {
    saving.value = true
    try {
      const res = await $fetch<ApiResponse<CompetitionBanWithUser>>(`/api/meets/${meetId.value}/ban-list`, {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: { vpfId: form.vpfId.trim(), reason: form.reason.trim() },
      })
      notify.result(res)
      if (res.success) {
        form.vpfId = ""
        form.reason = ""
        await load()
      }
    } finally {
      saving.value = false
    }
  }

  async function remove(vpfId: string) {
    const res = await $fetch<ApiResponse<unknown>>(`/api/meets/${meetId.value}/ban-list/${vpfId}`, {
      method: "DELETE",
      credentials: "include",
      ignoreResponseError: true,
    })
    notify.result(res)
    if (res.success) await load()
  }

  onMounted(load)

  return reactive({ bans, form, saving, preview, add, remove })
}

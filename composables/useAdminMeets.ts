import { registrationWindow } from "~/lib/domain/meet-formatters"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

/** The admin meets list: hidden meets on or off, a search, and the registration window of each. Call with `await`. */
export async function useAdminMeets() {
  const { t } = useI18n()

  const showHidden = ref(true)
  const search = ref("")

  const { data: response, pending, refresh } = await useFetch<ApiResponse<MeetPublic[]>>("/api/meets", {
    query: computed(() => (showHidden.value ? { includeHidden: "true" } : {})),
    credentials: "include",
    ignoreResponseError: true,
  })

  const rows = computed(() => (response.value?.success ? response.value.data : []))

  // One federation's meets fit comfortably in memory, so the search is client-side.
  const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()
    if (!term) return rows.value
    return rows.value.filter((meet) =>
      meet.meetName.toLowerCase().includes(term) || meet.meetSlug.toLowerCase().includes(term))
  })

  const windowOf = (meet: MeetPublic) => registrationWindow(meet, t("admin.meets.noLimit"))

  return reactive({ showHidden, search, filtered, pending, windowOf, refresh: () => refresh() })
}

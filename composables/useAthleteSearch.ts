import type { ApiResponse } from "~/types/api"
import type { AthleteListPage, UserPrivate } from "~/types/users"

const PAGE_SIZE = 20
const DEBOUNCE_MS = 250

/**
 * The admin athlete lookup behind the search dialog: every account, lapsed
 * members included, matched on VPF id, name (diacritics ignored), email or
 * national id. Searches as the admin types; a slower answer to an older query
 * never overwrites a newer one. Browser-only.
 */
export function useAthleteSearch() {
  const query = ref("")
  const results = ref<UserPrivate[]>([])
  const total = ref(0)
  const pending = ref(false)

  let latest = 0

  async function run(term: string, requestId: number) {
    const res = await $fetch<ApiResponse<AthleteListPage>>("/api/athletes", {
      query: { search: term, includeInactive: "true", pageSize: PAGE_SIZE },
      credentials: "include",
      ignoreResponseError: true,
    })
    if (requestId !== latest) return
    // An admin always gets the private columns; the cast narrows the shared list type.
    results.value = res.success ? (res.data.items as UserPrivate[]) : []
    total.value = res.success ? res.data.total : 0
    pending.value = false
  }

  watch(query, (value, _previous, onCleanup) => {
    const term = value.trim()
    const requestId = ++latest
    if (!term) {
      results.value = []
      total.value = 0
      pending.value = false
      return
    }
    pending.value = true
    const timer = setTimeout(() => void run(term, requestId), DEBOUNCE_MS)
    onCleanup(() => clearTimeout(timer))
  })

  function reset() {
    query.value = ""
  }

  return reactive({ query, results, total, pending, reset })
}

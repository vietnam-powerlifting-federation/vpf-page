import type { ApiResponse } from "~/types/api"
import type { EntryGenerationResult, EntryRoster, MeetEntryWithAthlete } from "~/types/entries"

/** A meet's roster as staff prepare it: generate it from paid registrations, assign sessions and flights, withdraw. Call with `await`. */
export async function useAdminMeetEntries() {
  const { t } = useI18n()
  const route = useRoute()
  const notify = useNotify()
  const toast = useToast()

  const meetId = computed(() => String(route.params.id))
  const exportUrl = computed(() => `/api/meets/${meetId.value}/entries/csv`)

  const { data: response, pending, refresh } = await useFetch<ApiResponse<EntryRoster>>(
    () => `/api/meets/${meetId.value}/entries`,
    { credentials: "include", ignoreResponseError: true },
  )

  const roster = computed(() => (response.value?.success ? response.value.data : null))
  const entries = computed(() => roster.value?.entries ?? [])
  const selected = ref<MeetEntryWithAthlete[]>([])

  /** Counts per weight class and division: what session planning actually needs. */
  const groupCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const entry of entries.value) {
      if (entry.withdrawn) continue
      const key = `${entry.division} ${entry.weightClass === 999 ? "+" : entry.weightClass}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => a.key.localeCompare(b.key))
  })

  function matchesResult(entry: MeetEntryWithAthlete) {
    const actual = entry.resultAssignment
    if (!actual) return true
    return actual.platform === entry.platform && actual.session === entry.session && actual.flight === entry.flight
  }

  const generating = ref(false)

  async function generate() {
    generating.value = true
    try {
      const res = await $fetch<ApiResponse<EntryGenerationResult>>(`/api/meets/${meetId.value}/entries/generate`, {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
      })
      notify.result(res, 5000)
      if (res.success) await refresh()
    } finally {
      generating.value = false
    }
  }

  async function patchEntry(entryId: number, body: Record<string, unknown>) {
    const res = await $fetch<ApiResponse<unknown>>(`/api/meets/${meetId.value}/entries/${entryId}`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
      body,
    })
    if (!res.success) notify.apiError(res)
    return res.success
  }

  async function onCellEdit(event: { data: MeetEntryWithAthlete; newValue: unknown; field: string }) {
    if (roster.value?.resultsImported) return
    const ok = await patchEntry(event.data.entryId, { [event.field]: event.newValue })
    if (ok) await refresh()
  }

  const bulk = reactive({ platform: "", session: "", flight: "" })
  const assigning = ref(false)

  async function bulkAssign() {
    assigning.value = true
    try {
      const body: Record<string, unknown> = { entryIds: selected.value.map((entry) => entry.entryId) }
      if (bulk.platform) body.platform = bulk.platform
      if (bulk.session) body.session = bulk.session
      if (bulk.flight) body.flight = bulk.flight

      const res = await $fetch<ApiResponse<{ updated: number }>>(`/api/meets/${meetId.value}/entries`, {
        method: "PATCH",
        credentials: "include",
        ignoreResponseError: true,
        body,
      })
      notify.result(res)
      if (res.success) {
        selected.value = []
        bulk.platform = bulk.session = bulk.flight = ""
        await refresh()
      }
    } finally {
      assigning.value = false
    }
  }

  async function withdraw(entry: MeetEntryWithAthlete) {
    if (await patchEntry(entry.entryId, { withdrawn: true })) {
      toast.add({ severity: "success", summary: t("admin.entries.withdrawn"), life: 3000 })
      await refresh()
    }
  }

  return reactive({
    meetId, exportUrl, roster, entries, selected, pending, groupCounts,
    matchesResult, generating, generate, onCellEdit,
    bulk, assigning, bulkAssign, withdraw,
    refresh: () => refresh(),
  })
}

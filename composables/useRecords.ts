import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord, RecordRow } from "~/types/records"
import type { Result } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"

type RecordsPayload = {
  records: LiftRecord[]
  meet: MeetPublic[] | MeetPublic | null
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

/**
 * Join records with their result, athlete and meet. Runs in `transform`, so on
 * the first render it happens on the server and the page payload carries these
 * rows instead of every national result since records began.
 */
function toRecordRows(data: RecordsPayload): RecordRow[] {
  const results = new Map(data.results.map((r) => [r.resultId, r]))
  const athletes = new Map(data.athletes.map((a) => [a.vpfId, a]))
  const meetList = Array.isArray(data.meet) ? data.meet : data.meet ? [data.meet] : []
  const meets = new Map(meetList.map((m) => [m.meetId, m]))

  const rows: RecordRow[] = []
  for (const record of data.records) {
    const result = results.get(record.resultId)
    if (!result) continue
    const athlete = athletes.get(result.vpfId)
    const meet = meets.get(result.meetId)
    rows.push({
      lift: record.lift,
      division: record.recordDivision,
      sex: result.sex,
      weightClass: result.weightClass,
      weight: record.recordWeight,
      attempt: record.attempt,
      vpfId: result.vpfId,
      name: athlete?.fullName ?? result.vpfId,
      slug: athlete?.slug ?? null,
      dob: athlete?.dob ?? null,
      bodyWeight: result.bodyWeight,
      meetName: meet?.meetName ?? null,
      meetSlug: meet?.meetSlug ?? null,
      hostDate: meet?.hostDate ?? null,
    })
  }
  return rows
}

/**
 * Records standing at the end of a season (`null` = the latest). `key` keeps
 * separate calls apart, e.g. the board and the previous season used by history.
 */
export function useRecords(year: MaybeRefOrGetter<number | null>, options: { key: string; immediate?: MaybeRefOrGetter<boolean> }) {
  const query = computed(() => ({ year: toValue(year) ?? undefined }))
  const enabled = computed(() => toValue(options.immediate ?? true))

  const { data, pending, error, execute, status } = useFetch("/api/records", {
    key: options.key,
    query,
    immediate: enabled.value,
    watch: false,
    transform: (res: ApiResponse<RecordsPayload>) => (res.success && res.data ? toRecordRows(res.data) : []),
  })

  // Fetch on demand: when first enabled, and again whenever the season changes.
  // The mount check covers a call that became enabled during server rendering.
  watch([query, enabled], () => {
    if (enabled.value) execute()
  })
  onMounted(() => {
    if (enabled.value && status.value === "idle") execute()
  })

  return {
    rows: computed(() => data.value ?? []),
    loaded: computed(() => status.value === "success"),
    pending,
    error,
  }
}

/** Records broken at one season's national championship (`null` = the latest). */
export function useRecordHistory(year: MaybeRefOrGetter<number | null>, enabled: MaybeRefOrGetter<boolean>) {
  const query = computed(() => ({ year: toValue(year) ?? undefined }))
  const on = computed(() => toValue(enabled))

  const { data, pending, error, execute, status } = useFetch("/api/records/history", {
    key: "records-history",
    query,
    immediate: on.value,
    watch: false,
    transform: (res: ApiResponse<RecordsPayload>) => {
      if (!res.success || !res.data) return { meet: null, rows: [] as RecordRow[] }
      const meet = Array.isArray(res.data.meet) ? res.data.meet[0] ?? null : res.data.meet
      return {
        meet: meet ? { meetName: meet.meetName, meetSlug: meet.meetSlug, hostDate: meet.hostDate, systemYear: meet.systemYear } : null,
        rows: toRecordRows(res.data),
      }
    },
  })

  watch([query, on], () => {
    if (on.value) execute()
  })
  onMounted(() => {
    if (on.value && status.value === "idle") execute()
  })

  return {
    meet: computed(() => data.value?.meet ?? null),
    rows: computed(() => data.value?.rows ?? []),
    loaded: computed(() => status.value === "success"),
    pending,
    error,
  }
}

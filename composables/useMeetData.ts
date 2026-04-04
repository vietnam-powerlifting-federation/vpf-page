import type { UserPublicWithDecorators } from "~/types/users"
import type { MeetPublic, MeetResult, MeetDataPayload } from "~/types/meets"
import type { Sex, Division } from "~/types/union-types"
import type { ApiResponse } from "~/types/api"

const sexOrder = ["male", "female"] satisfies Sex[]
const divisionOrder = ["open", "jr", "subjr", "mas1", "mas2", "mas3", "mas4", "guest"] satisfies Division[]

export type GroupedByGenderDivision = Array<{
  sex: Sex
  divisions: Array<{
    division: Division
    results: (MeetResult & { athlete?: UserPublicWithDecorators })[]
  }>
}>

export type MeetDataReturn = {
  meet: ComputedRef<MeetPublic | null>
  results: ComputedRef<MeetResult[]>
  athletes: ComputedRef<UserPublicWithDecorators[]>
  resultsWithAthletes: ComputedRef<(MeetResult & { athlete?: UserPublicWithDecorators })[]>
  groupedByGenderDivision: ComputedRef<GroupedByGenderDivision>
  pending: Ref<boolean>
  error: Ref<Error | null>
}

export function useMeetData(slug: string): MeetDataReturn {
  const nuxtApp = useNuxtApp()
  const { data: response, pending, error } = useFetch<ApiResponse<MeetDataPayload>>(
    `/api/meets/${slug}`,
    {
      key: `meet-data-${slug}`,
      getCachedData: (key) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
    },
  )
  const data = computed(() => response.value?.success ? response.value.data : null)

  const meet = computed(() => data.value?.meet ?? null)
  const results = computed<MeetResult[]>(() => (data.value?.results ?? []) as MeetResult[])
  const athletes = computed(() => data.value?.athletes ?? [])

  const athleteMap = computed(() => {
    const map = new Map<string, UserPublicWithDecorators>()
    for (const athlete of athletes.value) {
      map.set(athlete.vpfId, athlete)
    }
    return map
  })

  const resultsWithAthletes = computed(() => {
    const map = athleteMap.value
    const list = results.value
    const merged = new Array<MeetResult & { athlete?: UserPublicWithDecorators }>(list.length)
    for (let i = 0; i < list.length; i++) {
      const r = list[i]
      merged[i] = { ...r, athlete: map.get(r.vpfId) }
    }
    return merged
  })

  const groupedByGenderDivision = computed(() => {
    const list = resultsWithAthletes.value

    const grouped: Record<Sex, Record<Division, (MeetResult & { athlete?: UserPublicWithDecorators })[]>> =
      {} as Record<Sex, Record<Division, (MeetResult & { athlete?: UserPublicWithDecorators })[]>>

    for (const result of list) {
      const sexGroup = grouped[result.sex] ?? (grouped[result.sex] = {} as Record<Division, (MeetResult & { athlete?: UserPublicWithDecorators })[]>)
      const divisionGroup = sexGroup[result.division] ?? (sexGroup[result.division] = [])
      divisionGroup.push(result)
    }

    for (const sex of Object.keys(grouped) as Sex[]) {
      const divisions = grouped[sex]
      for (const division of Object.keys(divisions) as Division[]) {
        divisions[division].sort((a, b) => {
          if (a.weightClass !== b.weightClass) return a.weightClass - b.weightClass
          return a.placement - b.placement
        })
      }
    }

    const ordered: GroupedByGenderDivision = []
    for (const sex of sexOrder) {
      const sexGroup = grouped[sex]
      if (!sexGroup) continue
      const divisions: GroupedByGenderDivision[number]["divisions"] = []
      for (const division of divisionOrder) {
        const results = sexGroup[division]
        if (results?.length) divisions.push({ division, results })
      }
      if (divisions.length) ordered.push({ sex, divisions })
    }

    return ordered
  })

  return {
    meet,
    results,
    athletes,
    resultsWithAthletes,
    groupedByGenderDivision,
    pending,
    error: computed(() => error.value as Error | null),
  }
}

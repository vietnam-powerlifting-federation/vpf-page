import { onMounted } from "vue"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex, Division } from "~/types/union-types"
import { storeToRefs } from "pinia"
import { useMeetDataStore } from "~/stores/meet-data"

type MeetResult = Result & {
  squatPlacement: number
  benchPlacement: number
  deadliftPlacement: number
}

const sexOrder = ["male", "female"] satisfies Sex[]
const divisionOrder = ["open", "jr", "subjr", "mas1", "mas2", "mas3", "mas4", "guest"] satisfies Division[]

export type GroupedByGenderDivision = Array<{
  sex: Sex
  divisions: Array<{
    division: Division
    results: (MeetResult & { athlete?: UserPublic })[]
  }>
}>

export type MeetDataReturn = {
  meet: ComputedRef<MeetPublic | null>
  results: ComputedRef<MeetResult[]>
  athletes: ComputedRef<UserPublic[]>
  resultsWithAthletes: ComputedRef<(MeetResult & { athlete?: UserPublic })[]>
  groupedByGenderDivision: ComputedRef<GroupedByGenderDivision>
  pending: Ref<boolean>
  error: Ref<Error | null>
}

function createMeetData(slug: string): MeetDataReturn {
  const { $pinia } = useNuxtApp()
  const store = useMeetDataStore($pinia)
  const { bySlug } = storeToRefs(store)

  onMounted(() => {
    const entry = bySlug.value[slug]
    if (!entry?.data && !entry?.pending) {
      void store.fetchMeet(slug)
    }
  })

  const entry = computed(() => bySlug.value[slug])

  const meet = computed(() => entry.value?.data?.meet ?? null)

  const results = computed<MeetResult[]>(() => (entry.value?.data?.results ?? []) as MeetResult[])

  const athletes = computed(() => entry.value?.data?.athletes ?? [])

  /**
   * O(n) athlete lookup instead of O(n²)
   */
  const athleteMap = computed(() => {
    const map = new Map<string, UserPublic>()
    for (const athlete of athletes.value) {
      map.set(athlete.vpfId, athlete)
    }
    return map
  })

  const resultsWithAthletes = computed(() => {
    const map = athleteMap.value
    const list = results.value

    const merged = new Array<(MeetResult & { athlete?: UserPublic })>(list.length)

    for (let i = 0; i < list.length; i++) {
      const r = list[i]
      merged[i] = {
        ...r,
        athlete: map.get(r.vpfId),
      }
    }

    return merged
  })

  const groupedByGenderDivision = computed(() => {
    const list = resultsWithAthletes.value

    const grouped: Record<
      Sex,
      Record<Division, (MeetResult & { athlete?: UserPublic })[]>
    > = {} as Record<Sex, Record<Division, (MeetResult & { athlete?: UserPublic })[]>>

    for (const result of list) {
      const sexGroup = grouped[result.sex] ?? (grouped[result.sex] = {} as Record<
        Division,
        (MeetResult & { athlete?: UserPublic })[]
      >)

      const divisionGroup =
        sexGroup[result.division] ??
        (sexGroup[result.division] = [])

      divisionGroup.push(result)
    }

    for (const sex of Object.keys(grouped) as Sex[]) {
      const divisions = grouped[sex]

      for (const division of Object.keys(divisions) as Division[]) {
        divisions[division].sort((a, b) => {
          if (a.weightClass !== b.weightClass) {
            return a.weightClass - b.weightClass
          }
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
        if (results?.length) {
          divisions.push({ division, results })
        }
      }

      if (divisions.length) {
        ordered.push({ sex, divisions })
      }
    }

    return ordered
  })

  return {
    meet,
    results,
    athletes,
    resultsWithAthletes,
    groupedByGenderDivision,
    pending: computed(() => entry.value?.pending ?? false),
    error: computed(() => entry.value?.error ?? null),
  }
}

export function useMeetData(slug: string): MeetDataReturn {
  // Cached globally (per-request on SSR) via Pinia store keyed by slug.
  return createMeetData(slug)
}
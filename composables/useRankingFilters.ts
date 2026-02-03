import { ref, watch } from "vue"
import type { Sex, Division, MeetType } from "~/types/union-types"

export function useRankingFilters() {
  const search = ref<string>("")
  const sort = ref<string>("gl")
  const sexFilter = ref<Sex | null>(null)
  const divisionFilter = ref<Division | null>(null)
  const weightClassFilter = ref<{ weight: number | null; sex: Sex | null }>({ weight: null, sex: null })
  const meetTypeFilter = ref<MeetType | null>("national")

  // Keep sex consistent with weight class
  watch(weightClassFilter, (newVal) => {
    if (!newVal || !newVal.weight || !newVal.sex) return
    if (newVal.sex !== sexFilter.value) {
      sexFilter.value = newVal.sex
    }
  })

  watch(sexFilter, (newVal) => {
    if (newVal !== weightClassFilter.value.sex) {
      weightClassFilter.value = { weight: null, sex: null }
    }
  })

  return {
    search,
    sort,
    sex: sexFilter,
    division: divisionFilter,
    weightClass: weightClassFilter,
    meetType: meetTypeFilter
  }
}

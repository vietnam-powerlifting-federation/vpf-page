import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export const useMeetData = (slug: string) => {
  const { data: response, pending, error } = useFetch<ApiResponse<{
    meet: MeetPublic
    results: (Result & {
      squatPlacement: number
      benchPlacement: number
      deadliftPlacement: number
    })[]
    athletes: UserPublic[]
      }>>(`/api/meets/${slug}`,
      {
        key: `meet:${slug}`
      })

  const meet = computed(() => {
    if (response.value?.success && response.value.data) {
      return response.value.data.meet
    }
    return null
  })

  const results = computed(() => {
    if (response.value?.success && response.value.data) {
      return response.value.data.results
    }
    return []
  })

  const athletes = computed(() => {
    if (response.value?.success && response.value.data) {
      return response.value.data.athletes
    }
    return []
  })

  // Results with athlete data
  const resultsWithAthletes = computed(() => {
    return results.value.map(result => ({
      ...result,
      athlete: athletes.value.find(athlete => athlete.vpfId === result.vpfId)
    }))
  })

  return {
    meet,
    results,
    athletes,
    resultsWithAthletes,
    pending,
    error
  }
}

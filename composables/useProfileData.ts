import type { ApiResponse } from "~/types/api"
import type { AthleteDetailsData } from "~/types/users"

export function useProfileAthlete() {
  const { data, pending, error, refresh } = useFetch<ApiResponse<AthleteDetailsData>>(
    "/api/athletes/self",
    {
      query: { includeVipSettings: true },
    },
  )

  return {
    data: computed(() => data.value?.data ?? null),
    pending,
    error,
    refresh,
  }
}

import type { ApiResponse } from "~/types/api"
import type { AthleteDetailsData } from "~/types/users"

export const PROFILE_ATHLETE_KEY = "openvpf-profile-athlete"

export function useProfileAthlete() {
  const nuxtApp = useNuxtApp()
  const { data, pending, error, refresh } = useFetch<ApiResponse<AthleteDetailsData>>(
    "/api/athletes/self",
    {
      key: PROFILE_ATHLETE_KEY,
      query: { includeVipSettings: true },
      getCachedData: (key) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
    },
  )

  return {
    data: computed(() => data.value?.data ?? null),
    pending,
    error,
    refresh,
  }
}

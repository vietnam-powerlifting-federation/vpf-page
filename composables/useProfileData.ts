import { computed } from "vue"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { VipBenefits } from "~/types/vip"

export const PROFILE_ATHLETE_KEY = "openvpf-profile-athlete"

type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
}

let profileFetch: ReturnType<typeof useFetch<ApiResponse<AthleteDetailsData> | null>> | null = null

function getProfileFetch(): ReturnType<typeof useFetch<ApiResponse<AthleteDetailsData> | null>> {
  if (!profileFetch) {
    profileFetch = useFetch<ApiResponse<AthleteDetailsData>>("/api/athletes/self", {
      key: PROFILE_ATHLETE_KEY,
      query: { includeVipSettings: true },
    }) as ReturnType<typeof useFetch<ApiResponse<AthleteDetailsData> | null>>
  }
  return profileFetch!
}

export function useProfileAthlete() {
  return getProfileFetch()
}

export function useProfileUser() {
  const f = getProfileFetch()
  return {
    ...f,
    data: computed(() => f.data.value?.data?.athlete ?? null),
  }
}

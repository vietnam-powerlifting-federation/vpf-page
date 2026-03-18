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

function useProfileFetch() {
  return useFetch<ApiResponse<AthleteDetailsData>>("/api/athletes/self", {
    key: PROFILE_ATHLETE_KEY,
    query: { includeVipSettings: true },
  })
}

export function useProfileAthlete() {
  return useProfileFetch()
}

export function useProfileUser() {
  const f = useProfileFetch()
  return {
    ...f,
    data: computed(() => f.data.value?.data?.athlete ?? null),
  }
}

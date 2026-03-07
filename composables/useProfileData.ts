import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { MeetPublic } from "~/types/meets"

export const PROFILE_USER_KEY = "openvpf-profile-user"
export const PROFILE_ATHLETE_KEY = "openvpf-profile-athlete"

type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
}

function fetchProfileUser() {
  return useFetch<ApiResponse<UserPrivate>>("/api/users/self", {
    key: PROFILE_USER_KEY,
  })
}

type ProfileUserReturn = ReturnType<typeof fetchProfileUser>
let profileUserCache: ProfileUserReturn | null = null

export function useProfileUser(): ProfileUserReturn {
  if (!profileUserCache) {
    profileUserCache = fetchProfileUser()
  }
  return profileUserCache
}

function fetchProfileAthlete() {
  return useFetch<ApiResponse<AthleteDetailsData>>("/api/athletes/self", {
    key: PROFILE_ATHLETE_KEY,
  })
}

type ProfileAthleteReturn = ReturnType<typeof fetchProfileAthlete>
let profileAthleteCache: ProfileAthleteReturn | null = null

export function useProfileAthlete(): ProfileAthleteReturn {
  if (!profileAthleteCache) {
    profileAthleteCache = fetchProfileAthlete()
  }
  return profileAthleteCache
}

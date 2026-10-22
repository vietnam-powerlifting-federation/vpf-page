import type { ApiResponse } from "~/types/api"
import type { AthleteProfileData } from "~/types/users"

/**
 * The signed-in athlete's own record, backed by the shared session.
 *
 * This used to issue its own `useFetch` for `/api/athletes/me`, which on a
 * guarded page was the third request for a session the route guard and the
 * header had each already fetched. Reading `useAuthSession` instead makes it
 * free — by the time a page behind `middleware: "auth"` renders, the guard has
 * already resolved it.
 */
export function useProfileAthlete() {
  const { athlete, ready, ensureLoaded, refresh } = useAuthSession()

  // Pages that use this are auth-guarded, so the guard has normally resolved the
  // session already; this covers any caller that is not behind the guard.
  if (!ready.value) void ensureLoaded()

  return {
    data: athlete,
    pending: computed(() => !ready.value),
    /**
     * Settled but empty. On a guarded page the guard would have redirected an
     * unauthenticated visitor, so reaching this means the request itself failed.
     */
    error: computed(() => ready.value && athlete.value === null),
    refresh,
  }
}

/**
 * The athlete's own competition history — the meets they entered and their
 * results.
 *
 * Separate from `useProfileAthlete` because it is a genuinely different and much
 * more expensive shape: it joins meets and results, where the record above is a
 * single row. Only the competition-info page needs it.
 */
export function useProfileCompetitions() {
  const { data, pending, error } = useFetch<ApiResponse<AthleteProfileData>>(
    "/api/athletes/me/profile",
  )

  return {
    data: computed(() => (data.value?.success ? data.value.data : null)),
    pending,
    error,
  }
}

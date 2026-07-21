import type { ApiResponse } from "~/types/api"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

type AuthAthlete = { athlete: UserPublic; vipSettings?: VipBenefits }

/**
 * Client-side session for the current athlete.
 *
 * Deliberately avoids `useFetch`/`useAsyncData`: pages under "/openvpf/**" are
 * swr-cached and prerendered (see nuxt.config routeRules), so any server-fetched
 * session would be baked into the shared page payload and served to the wrong
 * user. State defaults to `null` (logged out) and is only ever populated by a
 * fresh client fetch, keeping the session strictly per-visitor.
 */
export function useAuthSession() {
  const athlete = useState<AuthAthlete | null>("auth-session-athlete", () => null)
  const ready = useState<boolean>("auth-session-ready", () => false)

  async function refresh() {
    try {
      const res = await $fetch<ApiResponse<AuthAthlete>>("/api/athletes/self", {
        query: { includeVipSettings: true },
        credentials: "include",
        ignoreResponseError: true,
      })
      athlete.value = res.success ? res.data : null
    } catch {
      athlete.value = null
    } finally {
      ready.value = true
    }
  }

  return {
    athlete,
    ready,
    isLoggedIn: computed(() => athlete.value !== null),
    refresh,
  }
}

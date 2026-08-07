import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

/**
 * `/api/athletes/self` returns the *private* column set for the caller's own
 * record — including `role`, which is what gates the admin entry in the nav.
 */
type AuthAthlete = { athlete: UserPrivate; vipSettings?: VipBenefits }

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
    /**
     * Convenience for rendering the admin nav entry. Not a security boundary —
     * every admin route is guarded server-side by `middleware/admin` and by
     * `requireAdmin` in each handler.
     */
    isAdmin: computed(() => athlete.value?.athlete?.role === "admin"),
    refresh,
  }
}

import type { ApiResponse } from "~/types/api"
import type { AthleteRecordData, UserPrivate } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

/**
 * `/api/athletes/me` resolves to the caller's own record, so it always answers
 * with the *private* column set — including `role`, which gates the admin nav.
 * The `scope` discriminant is checked once here so pages get a plain
 * `UserPrivate` rather than a union each has to narrow.
 */
type AuthAthlete = { athlete: UserPrivate; vipSettings: VipBenefits | null }

/** Holds the in-flight fetch on the Nuxt app instance so concurrent callers share one request. */
const INFLIGHT_KEY = "$vpfAuthSession"

type NuxtAppWithSession = ReturnType<typeof useNuxtApp> & {
  [INFLIGHT_KEY]?: Promise<void> | null
}

/**
 * The session for the current athlete — the single source for "who is asking".
 *
 * Route guards, the header and the profile pages all read this rather than
 * fetching for themselves. They used to fetch separately: `middleware/auth` hit
 * `/api/auth/session`, the header hit `/api/athletes/me`, and `useProfileAthlete`
 * hit it a third time, so one guarded page load cost three round trips for the
 * same answer. `ensureLoaded` collapses them into one.
 *
 * State is deliberately not populated during prerender: a prerendered page's
 * payload is one file served to every visitor, so a session baked into it would
 * be handed to the wrong person. Prerendering stays logged-out and the browser
 * fetches for real on hydration.
 */
export function useAuthSession() {
  const athlete = useState<AuthAthlete | null>("auth-session-athlete", () => null)
  const ready = useState<boolean>("auth-session-ready", () => false)

  async function fetchSession(): Promise<void> {
    // No visitor exists at prerender time, and anything stored would be shared.
    if (import.meta.prerender) {
      athlete.value = null
      ready.value = true
      return
    }

    try {
      const res = await $fetch<ApiResponse<AthleteRecordData>>("/api/athletes/me", {
        credentials: "include",
        ignoreResponseError: true,
        // On the server $fetch does not inherit the visitor's cookies, and the
        // auth token is HttpOnly, so it has to be forwarded explicitly.
        headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
      })
      athlete.value = res.success && res.data.scope === "private"
        ? { athlete: res.data.athlete, vipSettings: res.data.vipSettings }
        : null
    } catch {
      athlete.value = null
    } finally {
      ready.value = true
    }
  }

  /**
   * Resolve the session once per page load. Repeat callers get the settled
   * state; concurrent callers — a route guard and the header racing during
   * hydration — await the same request instead of issuing a second one.
   *
   * The in-flight promise hangs off the Nuxt app instance rather than module
   * scope, because on the server module scope is shared by every concurrent
   * request and parking it there would hand one visitor's session to another.
   */
  async function ensureLoaded(): Promise<void> {
    if (ready.value) return

    const nuxtApp = useNuxtApp() as NuxtAppWithSession
    if (!nuxtApp[INFLIGHT_KEY]) {
      nuxtApp[INFLIGHT_KEY] = fetchSession().finally(() => {
        nuxtApp[INFLIGHT_KEY] = null
      })
    }
    await nuxtApp[INFLIGHT_KEY]
  }

  /** Force a re-read, e.g. after the athlete edits their own profile. */
  async function refresh(): Promise<void> {
    await fetchSession()
  }

  return {
    athlete,
    ready,
    isLoggedIn: computed(() => athlete.value !== null),
    /**
     * Gates the admin nav entry and the `admin` route guard. Not the security
     * boundary — that is `requireAdmin` in every handler, which is what actually
     * stands between a non-admin and the data.
     */
    isAdmin: computed(() => athlete.value?.athlete?.role === "admin"),
    ensureLoaded,
    refresh,
  }
}

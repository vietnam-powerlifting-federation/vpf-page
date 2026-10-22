export default defineNuxtRouteMiddleware(async (to) => {
  // Reads the shared session rather than fetching its own. The auth token is an
  // HttpOnly cookie so the check still goes through the server, but
  // `ensureLoaded` makes that one request per page load instead of one per guard.
  const { ensureLoaded, isLoggedIn } = useAuthSession()
  await ensureLoaded()

  if (!isLoggedIn.value) {
    return navigateTo({ path: "/login", query: { to: to.fullPath } })
  }
})

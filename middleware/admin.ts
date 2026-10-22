export default defineNuxtRouteMiddleware(async (to) => {
  // Shares the session fetch with `middleware/auth` and the header; see
  // `useAuthSession`. This guard only decides what to render — `requireAdmin`
  // in each handler is what actually stands between a non-admin and the data.
  const { ensureLoaded, isLoggedIn, isAdmin } = useAuthSession()
  await ensureLoaded()

  if (!isLoggedIn.value) {
    return navigateTo({ path: "/login", query: { to: to.fullPath } })
  }

  if (!isAdmin.value) {
    return navigateTo("/openvpf")
  }
})

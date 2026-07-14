export default defineNuxtRouteMiddleware(async (to) => {
  // Auth token is an HttpOnly cookie, so verify role via the server session endpoint.
  // eslint-disable-next-line nuxt/prefer-import-meta
  const headers = process.server ? useRequestHeaders(["cookie"]) : undefined
  const res = await $fetch("/api/auth/session", {
    ignoreResponseError: true,
    credentials: "include",
    headers,
  }) as { success?: boolean; data?: { role?: string } } | null

  if (!res || res.success !== true) {
    return navigateTo({ path: "/login", query: { to: to.fullPath } })
  }

  if (res.data?.role !== "admin") {
    return navigateTo("/openvpf")
  }
})

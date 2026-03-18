export default defineNuxtRouteMiddleware(async () => {
  // Auth token is stored as HttpOnly cookie (not readable client-side),
  // so we verify authentication via server session endpoint.
  // eslint-disable-next-line nuxt/prefer-import-meta
  const headers = process.server ? useRequestHeaders(["cookie"]) : undefined
  const res = await $fetch("/api/auth/session", {
    ignoreResponseError: true,
    credentials: "include",
    headers,
  }) as { success?: boolean } | null
  if (!res || res.success !== true) {
    return navigateTo("/login")
  }
})

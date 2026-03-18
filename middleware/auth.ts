export default defineNuxtRouteMiddleware(async () => {
  // Auth token is stored as HttpOnly cookie (not readable client-side),
  // so we verify authentication via server session endpoint.
  const res = await $fetch("/api/auth/session", { ignoreResponseError: true }) as { success?: boolean } | null
  if (!res || res.success !== true) {
    return navigateTo("/login")
  }
})

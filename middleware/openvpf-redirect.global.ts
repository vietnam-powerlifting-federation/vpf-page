/** Top-level routes that are served as-is instead of being redirected under /openvpf. */
const ALLOWED_TOP_LEVEL_PREFIXES = ["/openvpf", "/login", "/register", "/verify-email", "/verification"]

export default defineNuxtRouteMiddleware((to) => {
  // Strip a leading locale segment (e.g. /vi) so the check works for all locales.
  const path = to.path.replace(/^\/vi(?=\/|$)/, "") || "/"

  if (ALLOWED_TOP_LEVEL_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"))) return

  return navigateTo("/openvpf" + to.path, { redirectCode: 301 })
})

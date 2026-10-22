/**
 * The three public sections in the header and the mobile drawer, with which
 * one the current route belongs to.
 */
export function useMainNav() {
  const route = useRoute()

  const items = [
    { to: "/", label: "nav.rankings" },
    { to: "/records", label: "nav.records" },
    { to: "/competitions", label: "nav.competitions" },
  ] as const

  const path = computed(() => route.path.replace(/^\/vi(?=\/|$)/, "") || "/")

  /** "page" on the section's own page, "true" on a page inside it, otherwise unset. */
  function ariaCurrent(to: string): "page" | "true" | undefined {
    if (path.value === to) return "page"
    if (to !== "/" && path.value.startsWith(`${to}/`)) return "true"
    if (to === "/" && path.value.startsWith("/athletes/")) return "true"
    return undefined
  }

  return { items, ariaCurrent }
}

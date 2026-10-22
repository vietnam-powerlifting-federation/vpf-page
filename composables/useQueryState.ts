import type { LocationQuery, LocationQueryRaw } from "vue-router"

type QueryValue = string | number

/**
 * Filter state that lives in the URL query, so a filtered view can be shared,
 * the back button steps through it, and the server renders the same list.
 *
 * Each key reads from `route.query` and falls back to its default; a value
 * equal to its default is left out of the URL so plain links stay plain.
 * Numbers are parsed back to numbers.
 *
 *   const query = useQueryState({ q: "", sort: "gl", page: 1 })
 *   query.state.sort            // "gl" unless ?sort=… says otherwise
 *   query.update({ sort: "total", page: 1 })
 *   query.update({ q: "an" }, { replace: true })   // typing: no history entry per key
 */
export function useQueryState<T extends Record<string, QueryValue>>(defaults: T) {
  const route = useRoute()
  const router = useRouter()

  function read(query: LocationQuery, key: keyof T & string): T[typeof key] {
    const fallback = defaults[key]
    const raw = query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value === null || value === undefined || value === "") return fallback
    if (typeof fallback === "number") {
      const n = Number(value)
      return (Number.isFinite(n) ? n : fallback) as T[typeof key]
    }
    return value as T[typeof key]
  }

  const state = computed(() => {
    const out = {} as T
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      out[key] = read(route.query, key)
    }
    return out
  })

  function update(patch: Partial<T>, options: { replace?: boolean } = {}) {
    const query: LocationQueryRaw = { ...route.query }
    for (const [key, value] of Object.entries(patch)) {
      // Undefined keys are dropped from the URL by the router.
      query[key] = value === undefined || value === "" || value === defaults[key] ? undefined : String(value)
    }
    const to = { query, hash: route.hash }
    return options.replace ? router.replace(to) : router.push(to)
  }

  /** Back to the defaults for every key this state owns; other query keys are kept. */
  function reset() {
    const cleared = Object.fromEntries(Object.keys(defaults).map((key) => [key, defaults[key]])) as Partial<T>
    return update(cleared)
  }

  /** How many keys differ from their default, ignoring the ones listed. */
  function countActive(ignore: (keyof T)[] = []) {
    return (Object.keys(defaults) as (keyof T)[]).filter((key) => !ignore.includes(key) && state.value[key] !== defaults[key]).length
  }

  return { state, update, reset, countActive, defaults }
}

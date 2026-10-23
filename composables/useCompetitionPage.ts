import { meetSections } from "~/lib/domain/meet-rows"

const TABS = ["scoresheet", "detailed", "gl-ranking"] as const
export type CompetitionTab = typeof TABS[number]

/**
 * A competition's page: the meet and its results, which of the three views is open
 * (kept in `?tab=` so a view can be shared), and the state the results area is in.
 * Returned as one reactive object.
 */
export function useCompetitionPage(slug: string) {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  const { meet, results, groupedByGenderDivision, resultsWithAthletes, pending, error } = useMeetData(slug)

  const tab = computed<CompetitionTab>(() => {
    const requested = route.query.tab
    return TABS.includes(requested as CompetitionTab) ? (requested as CompetitionTab) : "scoresheet"
  })

  function setTab(value: string) {
    router.replace({ query: { ...route.query, tab: value === "scoresheet" ? undefined : value } })
  }

  const state = computed<"loading" | "missing" | "empty" | "ready">(() => {
    if (pending.value && !meet.value) return "loading"
    if (error.value || !meet.value) return "missing"
    if (results.value.length === 0) return "empty"
    return "ready"
  })

  const sections = computed(() => meetSections(groupedByGenderDivision.value, t))

  return reactive({ meet, state, tab, setTab, sections, rows: resultsWithAthletes })
}

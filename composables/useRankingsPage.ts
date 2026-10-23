import { MEET_TYPE_LABEL_KEY, DIVISION_LABEL_KEY, SEX_LABEL_KEY, formatWeightClass } from "~/lib/domain/format"
import {
  RANKING_DEFAULTS,
  RANKING_MEET_TYPES,
  SORTS,
  clampPage,
  rankingApiFilters,
  searchRankings,
  slicePage,
  sortNameOf,
  type RankingQuery,
} from "~/lib/domain/rankings"
import type { Division, MeetType, Sex } from "~/types/union-types"

/**
 * Everything the Rankings page shows and changes: the URL-backed filters, the
 * ranked rows for them, search, paging and the removable filter chips.
 * Returned as one reactive object, so the page and its components read it
 * without `.value`.
 */
export function useRankingsPage() {
  const { t } = useI18n()
  const query = useQueryState(RANKING_DEFAULTS)
  const values = computed(() => query.state.value)

  const sortName = computed(() => sortNameOf(values.value.sort))
  const apiSort = computed(() => SORTS[sortName.value])

  const { rows: ranked, loaded, pending } = useRankings(computed(() => rankingApiFilters(values.value)))

  // VIP name colours, fetched once in the browser and shared across pages.
  const { fetchDecorators } = useNameDecorators()
  onMounted(fetchDecorators)

  const visible = computed(() => searchRankings(ranked.value, values.value.q))
  const page = computed(() => clampPage(values.value.page, visible.value.length, values.value.size))
  const pageRows = computed(() => slicePage(visible.value, page.value, values.value.size))

  /** Any filter change goes back to page 1. Typing replaces the history entry instead of adding one per key. */
  function setFilter(patch: Partial<RankingQuery>, replace = false) {
    return query.update({ ...patch, page: 1 }, { replace })
  }

  /** A weight class belongs to one category, so changing the category can drop it. */
  function setSex(sex: string) {
    const cls = values.value.cls
    return setFilter({ sex, cls: cls && sex && !cls.startsWith(`${sex}-`) ? "" : cls })
  }

  const setSort = (sort: string) => setFilter({ sort })
  const setSize = (size: number) => setFilter({ size })

  function goToPage(next: number) {
    return query.update({ page: next })
  }

  function reset() {
    return query.reset()
  }

  function removeChip(key: string) {
    if (key === "sex") return setSex("")
    return setFilter({ [key]: query.defaults[key as keyof RankingQuery] })
  }

  const chips = computed(() => {
    const s = values.value
    const out: { key: string; label: string }[] = []
    if (s.q) out.push({ key: "q", label: t("ranking.searchChip", { q: s.q }) })
    if (s.sex) out.push({ key: "sex", label: t(SEX_LABEL_KEY[s.sex as Sex]) })
    if (s.cls) {
      const [sex, weight] = s.cls.split("-")
      out.push({ key: "cls", label: formatWeightClass(Number(weight), sex) })
    }
    if (s.div) out.push({ key: "div", label: t(DIVISION_LABEL_KEY[s.div as Division]) })
    if (s.meet !== query.defaults.meet) {
      const known = (RANKING_MEET_TYPES as readonly string[]).includes(s.meet)
      out.push({ key: "meet", label: s.meet === "all" ? t("ranking.allMeetTypes") : known ? t(MEET_TYPE_LABEL_KEY[s.meet as MeetType]) : s.meet })
    }
    return out
  })

  /** Filters hidden behind the phone disclosure that differ from the default, plus a non-default sort. */
  const activeCount = computed(() => query.countActive(["q", "page", "size"]))

  return reactive({
    values, sortName, apiSort,
    ranked, visible, pageRows, page, loaded, pending,
    chips, activeCount,
    setFilter, setSort, setSize, setSex, goToPage, removeChip, reset,
  })
}

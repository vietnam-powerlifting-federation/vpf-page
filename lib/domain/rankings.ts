import { foldForSearch } from "~/lib/domain/format"
import type { SortKey } from "~/lib/domain/results"
import type { RankingRow } from "~/types/results"
import type { Division, MeetType, Sex } from "~/types/union-types"

/** URL sort names are short; the API uses the result column names. */
export const SORTS = { gl: "gl", total: "total", squat: "bestSquat", bench: "bestBench", deadlift: "bestDeadlift" } as const satisfies Record<string, SortKey>
export type SortName = keyof typeof SORTS

/** Translation key for each sort's label. */
export const SORT_LABEL_KEYS: Record<SortName, string> = {
  gl: "ranking.glPoints",
  total: "general.total",
  squat: "general.squat",
  bench: "general.bench",
  deadlift: "general.deadlift",
}

/** Meet types the rankings can be narrowed to. "all" lifts the filter. */
export const RANKING_MEET_TYPES = ["national", "national_qualifier", "amateur"] as const satisfies readonly MeetType[]

/** What the Rankings URL holds, with the value each key falls back to. */
export const RANKING_DEFAULTS = {
  q: "",
  sex: "",
  /** "male-74": a weight class belongs to one category. */
  cls: "",
  div: "",
  /** Rankings open on national championships, as before. */
  meet: "national",
  sort: "gl",
  page: 1,
  size: 25,
}
export type RankingQuery = typeof RANKING_DEFAULTS

export function sortNameOf(sort: string): SortName {
  return sort in SORTS ? (sort as SortName) : "gl"
}

/** The API's filters for what the URL holds. A weight class implies its category. */
export function rankingApiFilters(state: RankingQuery) {
  const [clsSex, clsWeight] = state.cls.split("-")
  return {
    sort: SORTS[sortNameOf(state.sort)],
    sex: (state.sex || clsSex || undefined) as Sex | undefined,
    division: (state.div || undefined) as Division | undefined,
    weightClass: clsWeight ? Number(clsWeight) : undefined,
    meetType: (state.meet === "all" ? undefined : state.meet) as MeetType | undefined,
  }
}

/** Search narrows the list but keeps each athlete's rank within the filter set. */
export function searchRankings(rows: RankingRow[], search: string): RankingRow[] {
  const q = foldForSearch(search.trim())
  if (!q) return rows
  return rows.filter((row) => foldForSearch(row.name).includes(q) || row.vpfId.toLowerCase().includes(q))
}

/** The page to show: the requested one, kept inside 1..last. */
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / size)))
}

export function slicePage<T>(rows: T[], page: number, size: number): T[] {
  const start = (page - 1) * size
  return rows.slice(start, start + size)
}

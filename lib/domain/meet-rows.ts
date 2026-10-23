import { DISQUALIFIED } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, SEX_LABEL_KEY, formatKg, formatWeightClass } from "~/lib/domain/format"
import type { GroupedByGenderDivision, MeetRow } from "~/types/meets"

type Translate = (key: string, params?: Record<string, unknown>) => string

/** The three lifts, with the result columns that hold each one's best and placement. */
export const LIFTS = [
  { key: "squat", best: "bestSquat", place: "squatPlacement" },
  { key: "bench", best: "bestBench", place: "benchPlacement" },
  { key: "deadlift", best: "bestDeadlift", place: "deadliftPlacement" },
] as const

/** Squat 1-3, bench 1-3, deadlift 1-3: the columns of the detailed scoresheet. */
export const ATTEMPT_COLUMNS = (["squat", "bench", "deadlift"] as const).flatMap((lift) =>
  ([1, 2, 3] as const).map((n) => ({
    key: `${lift}${n}` as `${typeof lift}${typeof n}`,
    lift,
    n,
    best: (lift === "squat" ? "bestSquat" : lift === "bench" ? "bestBench" : "bestDeadlift") as "bestSquat" | "bestBench" | "bestDeadlift",
  })))

/** One section per category and division, each split into weight-class row groups. */
export function meetSections(grouped: GroupedByGenderDivision, t: Translate) {
  return grouped.flatMap((sexGroup) =>
    sexGroup.divisions.map((divisionGroup) => {
      const byClass = new Map<number, MeetRow[]>()
      for (const row of divisionGroup.results) {
        const list = byClass.get(row.weightClass)
        if (list) list.push(row)
        else byClass.set(row.weightClass, [row])
      }
      return {
        key: `${sexGroup.sex}-${divisionGroup.division}`,
        label: t("meets.groupTitle", { sex: t(SEX_LABEL_KEY[sexGroup.sex]), division: t(DIVISION_LABEL_KEY[divisionGroup.division]) }),
        weightClasses: [...byClass].map(([weightClass, rows]) => ({
          key: String(weightClass),
          label: formatWeightClass(weightClass, sexGroup.sex),
          rows,
        })),
      }
    }))
}
export type MeetSection = ReturnType<typeof meetSections>[number]

/** Everyone who completed the meet, ranked by GL points across categories. */
export function glRanking(rows: MeetRow[]) {
  return rows
    .filter((r) => r.gl !== null && r.placement !== DISQUALIFIED)
    .sort((a, b) => (b.gl ?? 0) - (a.gl ?? 0))
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

/** Props for `RankCell`: a disqualified result shows "DSQ" instead of a place. */
export function placeProps(placement: number, t: Translate) {
  return placement === DISQUALIFIED
    ? { rank: null, label: t("meets.dsq"), labelTitle: t("meets.dsqTitle") }
    : { rank: placement }
}

/** Props for `AthleteCell`. */
export function athleteProps(row: MeetRow) {
  return {
    name: row.athlete?.fullName ?? row.vpfId,
    to: row.athlete ? `/athletes/${row.athlete.slug || row.athlete.vpfId}` : null,
    decorator1: row.athlete?.decorator1,
    decorator2: row.athlete?.decorator2,
  }
}

export function bodyWeightLabel(row: MeetRow, t: Translate, locale: string) {
  return row.bodyWeight ? t("meets.bodyWeightValue", { kg: formatKg(row.bodyWeight, locale) }) : undefined
}

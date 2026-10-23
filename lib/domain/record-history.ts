import type { RecordRow } from "~/types/records"
import type { Division, Sex } from "~/types/union-types"

export const RECORD_LIFTS = ["squat", "bench", "deadlift", "total"] as const

/** A record broken at a championship, with what it replaced. */
export type RecordHistoryRow = RecordRow & { previous: number | null; improvement: number | null }

/**
 * The records broken at one championship, grouped by lift, for one category and division.
 *
 * Within a weight class the rows read as a ladder: each row's improvement is over the row
 * before it, and the first row's is over the record standing before the championship
 * (`previous`, the season's records one year earlier), when there was one.
 */
export function groupRecordHistory(history: RecordRow[], standingBefore: RecordRow[], category: { sex: Sex; division: Division }) {
  const inCategory = (row: RecordRow) => row.sex === category.sex && row.division === category.division

  const before = new Map<string, number>()
  for (const row of standingBefore) {
    if (inCategory(row)) before.set(`${row.weightClass}-${row.lift}`, row.weight)
  }

  return RECORD_LIFTS.map((lift) => {
    const rows: RecordHistoryRow[] = history
      .filter((row) => row.lift === lift && inCategory(row))
      .sort((a, b) => a.weightClass - b.weightClass || a.weight - b.weight)
      .map((row, i, all) => {
        const earlier = all[i - 1]
        const sameClassBefore = earlier && earlier.weightClass === row.weightClass ? earlier.weight : null
        const previousRecord = sameClassBefore === null ? before.get(`${row.weightClass}-${lift}`) ?? null : null
        const base = sameClassBefore ?? previousRecord
        return { ...row, previous: previousRecord, improvement: base !== null ? row.weight - base : null }
      })
    return { lift, rows }
  }).filter((group) => group.rows.length > 0)
}

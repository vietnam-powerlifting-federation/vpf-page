/**
 * Build a LiftingCast results export in memory, so a test can state only the
 * columns it cares about while still exercising the real 72-column header.
 */
export const LIFTINGCAST_COLUMNS = [
  "Name", "Gender", "Raw/Equipped", "Team", "Lot", "State/Province", "Country",
  "Platform", "Session", "Flight", "Awards Division", "Body Weight (kg)", "Weight Class",
  "Wilks Coef", "Exact Age", "Division Based Age", "Age Coef",
  "Squat 1", "Squat 2", "Squat 3", "Best Squat",
  "Bench 1", "Bench 2", "Bench 3", "Best Bench", "Subtotal",
  "Deadlift 1", "Deadlift 2", "Deadlift 3", "Best Deadlift", "Total",
  "Dots Points", "Dots & Age Points", "Wilks Points", "Age Points", "Wilks & Age Points",
  "IPF Points", "IPF & Age Points", "Glossbrenner Points", "Glossbrenner & Age Points",
  "Schwartz Malone Points", "Schwartz Malone & Age Points", "Place",
  "S1LRef", "S1HRef", "S1RRef", "S2LRef", "S2HRef", "S2RRef", "S3LRef", "S3HRef", "S3RRef",
  "B1LRef", "B1HRef", "B1RRef", "B2LRef", "B2HRef", "B2RRef", "B3LRef", "B3HRef", "B3RRef",
  "D1LRef", "D1HRef", "D1RRef", "D2LRef", "D2HRef", "D2RRef", "D3LRef", "D3HRef", "D3RRef",
  "Member #", "Birth Date",
] as const

export type LiftingCastCell = string | number | null | undefined

/**
 * Fill in `Best Squat` / `Best Bench` / `Best Deadlift`, `Subtotal` and `Total`
 * the way LiftingCast does, so a test row passes the importer's cross-checks
 * without restating arithmetic. A bombed lift leaves the best blank and zeroes
 * the total, which is what the real export does.
 */
export function withDerivedTotals(row: Record<string, LiftingCastCell>): Record<string, LiftingCastCell> {
  const best = (prefix: string): number | null => {
    const attempts = [1, 2, 3]
      .map((n) => row[`${prefix} ${n}`])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(Number)
    return attempts.length === 0 ? null : Math.max(...attempts, 0)
  }

  const squat = best("Squat")
  const bench = best("Bench")
  const deadlift = best("Deadlift")
  const bombed = !squat || !bench || !deadlift

  return {
    ...row,
    "Best Squat": squat || "",
    "Best Bench": bench || "",
    "Best Deadlift": deadlift || "",
    Subtotal: squat && bench ? squat + bench : "",
    Total: bombed ? 0 : squat! + bench! + deadlift!,
  }
}

const DEFAULTS: Record<string, LiftingCastCell> = {
  "Raw/Equipped": "RAW",
  Country: "VN",
  Platform: "1",
  Session: "1",
  Flight: "A",
}

export function buildLiftingCastCsv(rows: Record<string, LiftingCastCell>[]): string {
  const escape = (value: LiftingCastCell) =>
    value === null || value === undefined ? "" : JSON.stringify(String(value))

  const lines = [LIFTINGCAST_COLUMNS.map((column) => JSON.stringify(column)).join(",")]
  for (const row of rows) {
    const merged = { ...DEFAULTS, ...row }
    lines.push(LIFTINGCAST_COLUMNS.map((column) => escape(merged[column])).join(","))
  }
  return `${lines.join("\n")}\n`
}

/** The multipart parts `readImportUpload` expects. */
export function importUploadParts(csv: string, extra: Record<string, string> = {}) {
  return [
    { name: "file", data: Buffer.from(csv, "utf8"), filename: "results.csv", type: "text/csv" },
    ...Object.entries(extra).map(([name, value]) => ({ name, data: Buffer.from(value, "utf8") })),
  ]
}

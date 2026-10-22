/**
 * Parsing half of the LiftingCast results import (admin tools spec §3).
 *
 * Pure: text in, typed rows out. No database, no H3, no side effects — which is
 * what makes the whole importer testable against fixture CSVs, and what lets the
 * preview and confirm endpoints share one parse.
 *
 * The export has ~71 columns. Only a handful are stored; the rest are either
 * matching keys, cross-checks, or recomputed by VPF and deliberately ignored.
 * In particular **none of the CSV's points columns are GL points** — VPF ranks on
 * IPF GL points computed at read time, and importing `IPF Points` (the older IPF
 * formula) or `Glossbrenner` (a different coefficient set) into a GL field would
 * silently corrupt every ranking. We take none of them.
 */
import { parseDivision, parseSex, parseWeightClass } from "~/lib/utils/liftingcast-mapping"
import { SUPPORTED_EQUIPMENT } from "~/lib/constants/liftingcast"
import type {
  AttemptSet,
  ImportIssue,
  LiftingCastRow,
  RefereeLights,
  ReportedTotals,
} from "~/types/attempts"

/** Columns the importer cannot proceed without. */
const REQUIRED_COLUMNS = [
  "Name",
  "Gender",
  "Awards Division",
  "Weight Class",
  "Body Weight (kg)",
  "Squat 1", "Squat 2", "Squat 3",
  "Bench 1", "Bench 2", "Bench 3",
  "Deadlift 1", "Deadlift 2", "Deadlift 3",
]

const ATTEMPT_COLUMNS: { key: keyof AttemptSet; column: string; refPrefix: string }[] = [
  { key: "squat1", column: "Squat 1", refPrefix: "S1" },
  { key: "squat2", column: "Squat 2", refPrefix: "S2" },
  { key: "squat3", column: "Squat 3", refPrefix: "S3" },
  { key: "bench1", column: "Bench 1", refPrefix: "B1" },
  { key: "bench2", column: "Bench 2", refPrefix: "B2" },
  { key: "bench3", column: "Bench 3", refPrefix: "B3" },
  { key: "deadlift1", column: "Deadlift 1", refPrefix: "D1" },
  { key: "deadlift2", column: "Deadlift 2", refPrefix: "D2" },
  { key: "deadlift3", column: "Deadlift 3", refPrefix: "D3" },
]

const LIFTS = [
  { name: "Squat", label: { en: "squat", vi: "squat" }, keys: ["squat1", "squat2", "squat3"] },
  { name: "Bench", label: { en: "bench", vi: "bench" }, keys: ["bench1", "bench2", "bench3"] },
  { name: "Deadlift", label: { en: "deadlift", vi: "deadlift" }, keys: ["deadlift1", "deadlift2", "deadlift3"] },
] as const satisfies readonly { name: string; label: { en: string; vi: string }; keys: readonly (keyof AttemptSet)[] }[]

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  // Strip a UTF-8 BOM; Excel adds one and it would poison the first header name.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (inQuotes) {
      if (char !== "\"") { field += char; continue }
      if (input[i + 1] === "\"") { field += "\""; i++ } else { inQuotes = false }
      continue
    }
    if (char === "\"") { inQuotes = true; continue }
    if (char === ",") { row.push(field); field = ""; continue }
    if (char === "\r") continue
    if (char === "\n") { row.push(field); field = ""; rows.push(row); row = []; continue }
    field += char
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row) }

  // Trailing blank lines are normal in exported files.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function text(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim()
  return trimmed === "" ? null : trimmed
}

function number(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * `users.dob` is a smallint year and so is `identity_verifications.dob` — VPF
 * holds no full date of birth anywhere (§6.4), so the CSV's date is only ever
 * usable to the year. Accepts DD/MM/YYYY (LiftingCast's format) and ISO.
 */
export function parseBirthYear(value: string | undefined): number | null {
  const raw = text(value)
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-\d{1,2}-\d{1,2}/)
  if (iso) return Number(iso[1])
  const dmy = raw.match(/^\d{1,2}[/-]\d{1,2}[/-](\d{4})$/)
  if (dmy) return Number(dmy[1])
  const bare = raw.match(/^(\d{4})$/)
  if (bare) return Number(bare[1])
  return null
}

function parseLight(value: string | undefined): boolean | null {
  const raw = (value ?? "").trim().toLowerCase()
  if (raw === "") return null
  if (["true", "white", "good", "1", "yes", "y"].includes(raw)) return true
  if (["false", "red", "bad", "0", "no", "n"].includes(raw)) return false
  return null
}

/**
 * Best lift as VPF computes it: `max(attempts, 0)`, null only when no attempt was
 * taken. Mirrors `calculateBestLift` in `lib/utils/meet-result.ts` — the two must
 * agree, which is exactly what the cross-check below proves against LiftingCast.
 */
export function bestOf(attempts: (number | null)[]): number | null {
  const values = attempts.filter((v): v is number => v !== null)
  if (values.length === 0) return null
  return Math.max(...values, 0)
}

/**
 * The check that settles how failed attempts are encoded (§3.4, open question §12.1).
 *
 * LiftingCast exports both the signed attempts and its own best lifts, so we can
 * assert `max(positive attempts, 0) === Best <Lift>` per row and per lift. If it
 * holds, negative-means-failed is confirmed and the attempts are stored verbatim.
 * If it does not, the parser is wrong and the import must hard-fail rather than
 * write — a silently mis-signed import turns successful lifts into
 * disqualifications across a whole meet.
 *
 * A bombed lift leaves `Best <Lift>` blank in the export rather than writing 0,
 * so a blank reported best is read as 0 when any attempt was taken.
 */
export function crossCheckBestLifts(attempts: AttemptSet, reported: ReportedTotals): ImportIssue[] {
  const issues: ImportIssue[] = []

  for (const lift of LIFTS) {
    const taken = lift.keys.map((key) => attempts[key])
    const computed = bestOf(taken)
    const reportedBest = reported[`best${lift.name}` as "bestSquat" | "bestBench" | "bestDeadlift"]
    // No attempt taken at all: LiftingCast leaves the column blank and so do we.
    if (computed === null) {
      if (reportedBest !== null && reportedBest !== 0) {
        issues.push({
          severity: "error",
          code: "attempts.best_mismatch",
          message: {
            en: `LiftingCast reports a best ${lift.label.en} of ${reportedBest} but no ${lift.label.en} attempt was exported`,
            vi: `LiftingCast báo mức ${lift.label.vi} tốt nhất là ${reportedBest} nhưng không có lần thực hiện nào được xuất ra`,
          },
        })
      }
      continue
    }
    if ((reportedBest ?? 0) !== computed) {
      issues.push({
        severity: "error",
        code: "attempts.best_mismatch",
        message: {
          en: `Best ${lift.label.en} disagrees: LiftingCast says ${reportedBest ?? 0}, attempts give ${computed}. The attempts were not parsed correctly — do not import.`,
          vi: `Mức ${lift.label.vi} tốt nhất không khớp: LiftingCast là ${reportedBest ?? 0}, các lần thực hiện cho ${computed}. Dữ liệu chưa được đọc đúng — không nên nhập.`,
        },
      })
    }
  }

  return issues
}

/**
 * The referee lights are the second, independent signal that the signs are right:
 * three whites against a negative attempt (or three reds against a positive one)
 * is a contradiction worth stopping for. Only fires when the lights are actually
 * present — most exports leave them blank, and an absent signal is not a conflict.
 */
export function crossCheckLights(
  attempts: AttemptSet,
  lights: Partial<Record<keyof AttemptSet, RefereeLights>>,
): ImportIssue[] {
  const issues: ImportIssue[] = []

  for (const { key } of ATTEMPT_COLUMNS) {
    const attempt = attempts[key]
    const light = lights[key]
    if (attempt === null || attempt === 0 || !light) continue

    const decided = [light.left, light.head, light.right].filter((v): v is boolean => v !== null)
    if (decided.length < 2) continue
    const whites = decided.filter(Boolean).length
    const good = whites > decided.length / 2

    if (good !== attempt > 0) {
      issues.push({
        severity: "error",
        code: "attempts.lights_contradict",
        message: {
          en: `Attempt ${key} is ${attempt} but the referee lights say ${good ? "good lift" : "no lift"}`,
          vi: `Lần thực hiện ${key} là ${attempt} nhưng đèn trọng tài báo ${good ? "hợp lệ" : "không hợp lệ"}`,
        },
      })
    }
  }

  return issues
}

/** Subtotal and total, as VPF computes them, for the advisory comparison against the CSV. */
function crossCheckTotals(attempts: AttemptSet, reported: ReportedTotals): ImportIssue[] {
  const issues: ImportIssue[] = []
  const squat = bestOf([attempts.squat1, attempts.squat2, attempts.squat3])
  const bench = bestOf([attempts.bench1, attempts.bench2, attempts.bench3])
  const deadlift = bestOf([attempts.deadlift1, attempts.deadlift2, attempts.deadlift3])

  const bombed = !squat || !bench || !deadlift
  // LiftingCast zeroes the total when a lift is bombed; so does VPF's DQ rule.
  const expectedTotal = bombed ? 0 : squat + bench + deadlift
  if ((reported.total ?? 0) !== expectedTotal) {
    issues.push({
      severity: "warning",
      code: "totals.total_mismatch",
      message: {
        en: `Total disagrees: LiftingCast says ${reported.total ?? 0}, best lifts give ${expectedTotal}`,
        vi: `Tổng không khớp: LiftingCast là ${reported.total ?? 0}, các mức tốt nhất cho ${expectedTotal}`,
      },
    })
  }

  if (reported.subtotal !== null && squat && bench && reported.subtotal !== squat + bench) {
    issues.push({
      severity: "warning",
      code: "totals.subtotal_mismatch",
      message: {
        en: `Subtotal disagrees: LiftingCast says ${reported.subtotal}, squat + bench give ${squat + bench}`,
        vi: `Tổng phụ không khớp: LiftingCast là ${reported.subtotal}, squat + bench cho ${squat + bench}`,
      },
    })
  }

  return issues
}

export type ParsedCsv = {
  rows: LiftingCastRow[]
  /** File-level problems — a missing required column stops the whole import. */
  issues: ImportIssue[]
}

/** Parse a LiftingCast results export into typed rows with per-row issues attached. */
export function parseLiftingCastCsv(csv: string): ParsedCsv {
  const table = parseCsvText(csv)
  if (table.length === 0) {
    return {
      rows: [],
      issues: [{
        severity: "error",
        code: "file.empty",
        message: { en: "The file is empty", vi: "Tệp trống" },
      }],
    }
  }

  const header = (table[0] ?? []).map((column) => column.trim())
  const index = new Map(header.map((name, i) => [name, i]))
  const missing = REQUIRED_COLUMNS.filter((name) => !index.has(name))
  if (missing.length > 0) {
    return {
      rows: [],
      issues: [{
        severity: "error",
        code: "file.missing_columns",
        message: {
          en: `This does not look like a LiftingCast results export. Missing column(s): ${missing.join(", ")}`,
          vi: `Tệp này không giống bản xuất kết quả của LiftingCast. Thiếu cột: ${missing.join(", ")}`,
        },
      }],
    }
  }

  const rows = table.slice(1).map((cells, i) => parseRow(cells, index, i + 1))
  return { rows, issues: [] }
}

function parseRow(cells: string[], index: Map<string, number>, lineNumber: number): LiftingCastRow {
  const cell = (column: string): string | undefined => {
    const at = index.get(column)
    return at === undefined ? undefined : cells[at]
  }

  const issues: ImportIssue[] = []

  const name = text(cell("Name")) ?? ""
  const sexRaw = text(cell("Gender")) ?? ""
  const sex = parseSex(sexRaw)
  if (!sex) {
    issues.push({
      severity: "error",
      code: "sex.unmapped",
      message: {
        en: `Unrecognised gender "${sexRaw}"`,
        vi: `Không nhận dạng được giới tính "${sexRaw}"`,
      },
    })
  }

  // No equipment column exists anywhere in the schema, so raw and equipped results
  // would share one ranking. VPF sanctions raw only: reject the row rather than
  // silently merge it (§3.1, §12.2).
  const equipment = text(cell("Raw/Equipped")) ?? ""
  if (equipment && equipment.toLowerCase() !== SUPPORTED_EQUIPMENT) {
    issues.push({
      severity: "error",
      code: "equipment.unsupported",
      message: {
        en: `Equipment category "${equipment}" is not supported — VPF ranks raw lifting only, and there is no column to keep the two apart`,
        vi: `Hạng trang bị "${equipment}" không được hỗ trợ — VPF chỉ xếp hạng raw và không có cột nào để tách hai loại`,
      },
    })
  }

  const divisionRaw = text(cell("Awards Division")) ?? ""
  const division = parseDivision(divisionRaw)
  if (!division) {
    issues.push({
      severity: "error",
      code: "division.unmapped",
      message: {
        en: `Unrecognised awards division "${divisionRaw}". Correct it in LiftingCast and re-export.`,
        vi: `Không nhận dạng được hạng giải thưởng "${divisionRaw}". Hãy sửa trong LiftingCast rồi xuất lại.`,
      },
    })
  }

  const weightClassRaw = text(cell("Weight Class")) ?? ""
  const weightClass = sex ? parseWeightClass(weightClassRaw, sex) : null
  if (sex && weightClass === null) {
    issues.push({
      severity: "error",
      code: "weight_class.invalid",
      message: {
        en: `Weight class "${weightClassRaw}" is not a valid ${sex} class`,
        vi: `Hạng cân "${weightClassRaw}" không hợp lệ cho giới tính ${sex === "male" ? "nam" : "nữ"}`,
      },
    })
  }

  const bodyWeight = number(cell("Body Weight (kg)"))
  if (bodyWeight === null) {
    issues.push({
      severity: "warning",
      code: "body_weight.missing",
      message: {
        en: "No bodyweight — the result will be disqualified and carry no GL points",
        vi: "Không có cân nặng — kết quả sẽ bị loại và không có điểm GL",
      },
    })
  }

  const attempts = Object.fromEntries(
    ATTEMPT_COLUMNS.map(({ key, column }) => [key, number(cell(column))]),
  ) as unknown as AttemptSet

  const lights: Partial<Record<keyof AttemptSet, RefereeLights>> = {}
  for (const { key, refPrefix } of ATTEMPT_COLUMNS) {
    const left = parseLight(cell(`${refPrefix}LRef`))
    const head = parseLight(cell(`${refPrefix}HRef`))
    const right = parseLight(cell(`${refPrefix}RRef`))
    if (left !== null || head !== null || right !== null) lights[key] = { left, head, right }
  }

  const reported: ReportedTotals = {
    bestSquat: number(cell("Best Squat")),
    bestBench: number(cell("Best Bench")),
    bestDeadlift: number(cell("Best Deadlift")),
    subtotal: number(cell("Subtotal")),
    total: number(cell("Total")),
    place: number(cell("Place")),
  }

  issues.push(...crossCheckBestLifts(attempts, reported))
  issues.push(...crossCheckLights(attempts, lights))
  issues.push(...crossCheckTotals(attempts, reported))

  return {
    lineNumber,
    name,
    memberNumber: text(cell("Member #")),
    birthYear: parseBirthYear(cell("Birth Date")),
    sexRaw,
    sex,
    equipment,
    team: text(cell("Team")),
    lot: number(cell("Lot")),
    platform: text(cell("Platform")),
    session: text(cell("Session")),
    flight: text(cell("Flight")),
    divisionRaw,
    division,
    bodyWeight,
    weightClassRaw,
    weightClass,
    attempts,
    reported,
    lights,
    issues,
  }
}

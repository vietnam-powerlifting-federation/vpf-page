/**
 * Shapes for the LiftingCast results round trip (admin tools spec §3).
 *
 * The import is a *declarative replace* of one meet's public record: a preview
 * step resolves every CSV line into one of these rows, and the confirm step
 * upserts them and deletes whatever the CSV omitted. Nothing here is persisted —
 * `meet_results` is the storage shape; these are the wire shapes between the
 * parser, the preview endpoint and the preview table.
 */
import type { Division, Sex } from "~/types/union-types"

export type BilingualText = { en: string; vi: string }

/** Blocking errors disable the confirm button; warnings are advisory and do not. */
export type ImportIssueSeverity = "error" | "warning"

export type ImportIssue = {
  severity: ImportIssueSeverity
  /** Stable machine code, e.g. "division.unmapped" — the UI groups on it. */
  code: string
  message: BilingualText
}

/**
 * The nine attempts exactly as LiftingCast writes them: a negative weight is a
 * failed attempt and null is an attempt never taken. Confirmed empirically — see
 * `crossCheckBestLifts`, which is what makes storing them verbatim safe.
 */
export type AttemptSet = {
  squat1: number | null
  squat2: number | null
  squat3: number | null
  bench1: number | null
  bench2: number | null
  bench3: number | null
  deadlift1: number | null
  deadlift2: number | null
  deadlift3: number | null
}

/**
 * LiftingCast's own derived values. VPF recomputes all of these, so they are
 * never stored — they are compared, and a mismatch is the loudest signal in the
 * whole importer that the parse is wrong.
 */
export type ReportedTotals = {
  bestSquat: number | null
  bestBench: number | null
  bestDeadlift: number | null
  subtotal: number | null
  total: number | null
  place: number | null
}

/** Three referee lights for one attempt; true is a white light. Read as corroboration, never stored. */
export type RefereeLights = {
  left: boolean | null
  head: boolean | null
  right: boolean | null
}

/** One parsed CSV line. Pure: nothing here has touched the database. */
export type LiftingCastRow = {
  /** 1-based line number in the file, header excluded — what the preview shows. */
  lineNumber: number
  name: string
  memberNumber: string | null
  /** `users.dob` is a year, so the CSV's full date is only usable to the year (§6.4). */
  birthYear: number | null
  sexRaw: string
  sex: Sex | null
  equipment: string
  team: string | null
  lot: number | null
  platform: string | null
  session: string | null
  flight: string | null
  divisionRaw: string
  division: Division | null
  bodyWeight: number | null
  weightClassRaw: string
  weightClass: number | null
  attempts: AttemptSet
  reported: ReportedTotals
  /** Keyed `squat1`, `bench3`, … — present only for attempts whose lights were exported. */
  lights: Partial<Record<keyof AttemptSet, RefereeLights>>
  issues: ImportIssue[]
}

export type MatchMethod = "member" | "name_birth_year" | "name" | "manual"

export type MatchCandidate = {
  vpfId: string
  fullName: string
  dob: number | null
}

export type RowMatch = {
  vpfId: string | null
  method: MatchMethod | null
  /**
   * A name-only match is never automatic — the admin binds it in the preview.
   * True means "found something, but you must confirm it".
   */
  needsConfirmation: boolean
  candidates: MatchCandidate[]
}

/**
 * What the row will actually look like on the public site once written. This is
 * the reason the preview step exists: a bodyweight outside the entered class
 * disqualifies an athlete with no error anywhere, and a preview that only echoed
 * the CSV back would let it through.
 */
export type RowDerived = {
  bestSquat: number | null
  bestBench: number | null
  bestDeadlift: number | null
  total: number | null
  gl: number | null
  placement: number
  disqualified: boolean
  dqReasons: BilingualText[]
}

export type RowAction = "create" | "update" | "unchanged" | "delete" | "skip"

export type FieldChange = {
  field: string
  before: string | number | boolean | null
  after: string | number | boolean | null
}

export type ImportRowPreview = {
  row: LiftingCastRow
  match: RowMatch
  derived: RowDerived
  action: RowAction
  changes: FieldChange[]
  /** Set when the row's team name does not exist yet and will be created on confirm. */
  createsTeam: string | null
}

/** A `meet_results` row present in the database and absent from the CSV: it will be deleted. */
export type ImportDeletion = {
  vpfId: string
  fullName: string
  division: Division
  weightClass: number
}

export type ImportPreview = {
  meetId: number
  meetName: string
  /**
   * Checksum of the parsed content. The confirm endpoint re-parses the uploaded
   * file and refuses if this differs, so what is committed is provably what was
   * previewed.
   */
  checksum: string
  rows: ImportRowPreview[]
  deletions: ImportDeletion[]
  teamsToCreate: string[]
  counts: {
    create: number
    update: number
    unchanged: number
    delete: number
    skip: number
    errors: number
    warnings: number
  }
  /** True when any blocking error is present — the confirm button stays disabled. */
  blocked: boolean
  /** File-level problems: wrong columns, legacy meet, unparseable CSV. */
  issues: ImportIssue[]
}

export type ImportResult = {
  meetId: number
  created: number
  updated: number
  deleted: number
  teamsCreated: string[]
  /** The system year whose records cache was invalidated (§3.6). */
  systemYear: number
}

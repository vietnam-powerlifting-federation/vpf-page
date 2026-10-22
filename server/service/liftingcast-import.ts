/**
 * Resolution half of the LiftingCast results import (admin tools spec §3).
 *
 * Reads the database to match athletes and teams and to diff against the meet's
 * current results, then hands back a fully-resolved preview. It **never writes** —
 * `applyImport` is the only function here that mutates, and it does so in one
 * transaction from a context that was re-derived server-side.
 *
 * There is no H3 dependency, so both endpoints share one parse and the whole
 * thing is testable against fixture CSVs.
 */
import { createHash } from "node:crypto"
import { and, eq, inArray, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetResults, teams, users } from "~/lib/external/drizzle/migrations/schema"
import { parseLiftingCastCsv } from "~/lib/utils/liftingcast-csv"
import { addMetadataToMeetResults, describeDisqualification } from "~/lib/utils/meet-result"
import { DISQUALIFIED, RANKED_DIVISION } from "~/lib/constants/constants"
import type { MeetRow } from "~/server/utils/competition-registration"
import type {
  FieldChange,
  ImportDeletion,
  ImportIssue,
  ImportPreview,
  ImportResult,
  ImportRowPreview,
  LiftingCastRow,
  MatchCandidate,
  RowAction,
  RowDerived,
  RowMatch,
} from "~/types/attempts"
import type { ResultRaw } from "~/types/results"

/**
 * The admin's per-row decisions from the preview: bind an unmatched row to a VPF
 * id, or skip it entirely (a guest lifter from another federation may simply have
 * no account). Keyed by the CSV line number.
 */
export type ImportOverrides = Record<number, { vpfId?: string; skip?: boolean }>

/** Only these columns come from the CSV; `ranked` and `showOnProfile` are VPF's own (§3.5). */
const STORED_FIELDS = [
  "sex", "weightClass", "division", "bodyWeight",
  "squat1", "squat2", "squat3",
  "bench1", "bench2", "bench3",
  "deadlift1", "deadlift2", "deadlift3",
  "platform", "session", "flight", "lot", "teamId",
] as const

type StoredField = typeof STORED_FIELDS[number]
type StoredValues = Pick<typeof meetResults.$inferInsert, StoredField>

/** One resolved row, ready to write. `lineNumber` ties it back to its CSV line. */
export type ImportWrite = {
  lineNumber: number
  vpfId: string
  values: StoredValues
  ranked: boolean
  showOnProfile: boolean
  isNew: boolean
  /** Set when the team does not exist yet, so its id can be filled in on commit. */
  pendingTeamName: string | null
}

export type ImportContext = {
  preview: ImportPreview
  /** Ready for `applyImport`; rows with a blocking error or an explicit skip are absent. */
  writes: ImportWrite[]
  /** VPF ids whose existing `meet_results` row the CSV omits, and which will be deleted. */
  deletions: string[]
  teamsToCreate: string[]
}

/**
 * Hash of the *parsed* content rather than the raw bytes, so re-saving the file
 * with different line endings does not invalidate a preview, while any change to
 * a value does. The confirm endpoint refuses a mismatch, which is what makes
 * "what is committed is provably what was previewed" true.
 */
export function computeChecksum(rows: LiftingCastRow[]): string {
  const canonical = rows.map((row) => ({
    line: row.lineNumber,
    name: row.name,
    member: row.memberNumber,
    birthYear: row.birthYear,
    sex: row.sex,
    equipment: row.equipment,
    team: row.team,
    lot: row.lot,
    platform: row.platform,
    session: row.session,
    flight: row.flight,
    division: row.divisionRaw,
    weightClass: row.weightClassRaw,
    bodyWeight: row.bodyWeight,
    attempts: row.attempts,
    reported: row.reported,
  }))
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex")
}

const LEGACY_MEET_ISSUE: ImportIssue = {
  severity: "error",
  code: "meet.legacy",
  message: {
    en: "This meet is marked legacy: its results live in legacy_meet_results, which stores best lifts only and predates LiftingCast. There is nothing to import.",
    vi: "Giải đấu này được đánh dấu là legacy: kết quả nằm trong legacy_meet_results, chỉ lưu mức tốt nhất và có trước LiftingCast. Không có gì để nhập.",
  },
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Match a CSV row to exactly one athlete (`meet_results` is unique on meetId+vpfId).
 *
 * `Member #` first — the entries export writes `vpfId` into that field precisely
 * so results come home unambiguously. Name + birth year is the fallback, and a
 * name-only hit is never automatic: it is surfaced for the admin to confirm.
 */
function matchAthlete(
  row: LiftingCastRow,
  byVpfId: Map<string, MatchCandidate>,
  byName: Map<string, MatchCandidate[]>,
  override?: { vpfId?: string; skip?: boolean },
): RowMatch {
  if (override?.vpfId) {
    const athlete = byVpfId.get(override.vpfId)
    return {
      vpfId: athlete?.vpfId ?? null,
      method: "manual",
      needsConfirmation: false,
      candidates: athlete ? [athlete] : [],
    }
  }

  if (row.memberNumber) {
    const athlete = byVpfId.get(row.memberNumber.trim().toUpperCase())
    if (athlete) return { vpfId: athlete.vpfId, method: "member", needsConfirmation: false, candidates: [athlete] }
  }

  const sameName = byName.get(normalizeName(row.name)) ?? []
  if (sameName.length > 0) {
    const withYear = row.birthYear === null ? [] : sameName.filter((a) => a.dob === row.birthYear)
    const onlyMatch = withYear.length === 1 ? withYear[0] : undefined
    if (onlyMatch) {
      return { vpfId: onlyMatch.vpfId, method: "name_birth_year", needsConfirmation: false, candidates: withYear }
    }
    // Name-only, or an ambiguous birth-year hit: the admin decides.
    return { vpfId: null, method: "name", needsConfirmation: true, candidates: sameName }
  }

  return { vpfId: null, method: null, needsConfirmation: false, candidates: [] }
}

function toStoredValues(row: LiftingCastRow, teamId: number | null): StoredValues {
  return {
    sex: row.sex!,
    weightClass: row.weightClass!,
    division: row.division!,
    bodyWeight: row.bodyWeight,
    squat1: row.attempts.squat1,
    squat2: row.attempts.squat2,
    squat3: row.attempts.squat3,
    bench1: row.attempts.bench1,
    bench2: row.attempts.bench2,
    bench3: row.attempts.bench3,
    deadlift1: row.attempts.deadlift1,
    deadlift2: row.attempts.deadlift2,
    deadlift3: row.attempts.deadlift3,
    platform: row.platform,
    session: row.session,
    flight: row.flight,
    lot: row.lot,
    teamId,
  }
}

function pickStored(row: typeof meetResults.$inferSelect): StoredValues {
  return Object.fromEntries(STORED_FIELDS.map((field) => [field, row[field]])) as unknown as StoredValues
}

function diffStored(before: StoredValues | null, after: StoredValues): FieldChange[] {
  if (!before) return []
  const changes: FieldChange[] = []
  for (const field of STORED_FIELDS) {
    const from = before[field] ?? null
    const to = after[field] ?? null
    if (from !== to) changes.push({ field, before: from, after: to })
  }
  return changes
}

/** Neutral placeholder for rows that will not be written; the UI shows the action instead. */
function emptyDerived(): RowDerived {
  return {
    bestSquat: null, bestBench: null, bestDeadlift: null,
    total: null, gl: null, placement: 0,
    disqualified: false, dqReasons: [],
  }
}

/**
 * Parse, match, map and derive — writing nothing. The returned preview is exactly
 * what the confirm step will commit, and `applyImport` takes this same context so
 * the two can never drift.
 */
export async function buildImportContext(
  meet: MeetRow,
  csv: string,
  overrides: ImportOverrides = {},
): Promise<ImportContext> {
  const parsed = parseLiftingCastCsv(csv)
  const checksum = computeChecksum(parsed.rows)
  const fileIssues = [...parsed.issues]

  // Legacy meets predate LiftingCast and store best lifts only. Refuse outright
  // rather than half-mapping into the wrong table (§3.7).
  if (meet.legacy) fileIssues.push(LEGACY_MEET_ISSUE)

  if (fileIssues.length > 0) {
    return {
      preview: {
        meetId: meet.meetId,
        meetName: meet.meetName,
        checksum,
        rows: [],
        deletions: [],
        teamsToCreate: [],
        counts: { create: 0, update: 0, unchanged: 0, delete: 0, skip: 0, errors: fileIssues.length, warnings: 0 },
        blocked: true,
        issues: fileIssues,
      },
      writes: [],
      deletions: [],
      teamsToCreate: [],
    }
  }

  // ---- Look up everything the rows could refer to, in three queries. ----
  const memberNumbers = parsed.rows
    .map((row) => row.memberNumber?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value))
  const overrideIds = Object.values(overrides)
    .map((override) => override.vpfId)
    .filter((value): value is string => Boolean(value))
  const vpfIds = [...new Set([...memberNumbers, ...overrideIds])]
  const names = [...new Set(parsed.rows.map((row) => normalizeName(row.name)).filter(Boolean))]

  // Compare names the way `normalizeName` does — trimmed, lowercased, inner
  // whitespace collapsed — so "Lê  Xuân Lợi" and "Lê Xuân Lợi" are one athlete.
  const normalizedFullName = sql<string>`lower(regexp_replace(btrim(${users.fullName}), '\s+', ' ', 'g'))`

  const athleteRows = vpfIds.length === 0 && names.length === 0
    ? []
    : await db
      .select({ vpfId: users.vpfId, fullName: users.fullName, dob: users.dob })
      .from(users)
      .where(or(
        vpfIds.length > 0 ? inArray(users.vpfId, vpfIds) : undefined,
        names.length > 0 ? inArray(normalizedFullName, names) : undefined,
      ))

  const byVpfId = new Map<string, MatchCandidate>(athleteRows.map((athlete) => [athlete.vpfId, athlete]))
  const byName = new Map<string, MatchCandidate[]>()
  for (const athlete of athleteRows) {
    const key = normalizeName(athlete.fullName)
    byName.set(key, [...(byName.get(key) ?? []), athlete])
  }

  const teamNames = [...new Set(parsed.rows.map((row) => row.team).filter((team): team is string => Boolean(team)))]
  const teamRows = teamNames.length === 0
    ? []
    : await db.select().from(teams).where(inArray(teams.teamName, teamNames))
  const teamIdByName = new Map(teamRows.map((team) => [team.teamName, team.teamId]))

  const existingRows = await db.select().from(meetResults).where(eq(meetResults.meetId, meet.meetId))
  const existingByVpfId = new Map(existingRows.map((row) => [row.vpfId, row]))

  // ---- Resolve each row. ----
  const previews: ImportRowPreview[] = []
  const writes: ImportWrite[] = []
  const seen = new Set<string>()
  const teamsToCreate = new Set<string>()

  for (const row of parsed.rows) {
    const override = overrides[row.lineNumber]
    const issues = [...row.issues]
    const match = matchAthlete(row, byVpfId, byName, override)

    if (override?.skip) {
      previews.push({
        row: { ...row, issues },
        match,
        derived: emptyDerived(),
        action: "skip",
        changes: [],
        createsTeam: null,
      })
      continue
    }

    if (override?.vpfId && !match.vpfId) {
      issues.push({
        severity: "error",
        code: "athlete.override_not_found",
        message: {
          en: `No athlete with VPF id ${override.vpfId}`,
          vi: `Không có vận động viên với mã VPF ${override.vpfId}`,
        },
      })
    } else if (!match.vpfId) {
      issues.push({
        severity: "error",
        code: match.needsConfirmation ? "athlete.needs_confirmation" : "athlete.unmatched",
        message: match.needsConfirmation
          ? {
            en: `"${row.name}" matches ${match.candidates.length} athlete(s) by name only — confirm which one, or skip the row`,
            vi: `"${row.name}" chỉ khớp tên với ${match.candidates.length} vận động viên — hãy xác nhận người đúng hoặc bỏ qua dòng này`,
          }
          : {
            en: `No athlete matched for "${row.name}"${row.memberNumber ? ` (member #${row.memberNumber})` : ""} — bind a VPF id or skip the row`,
            vi: `Không tìm thấy vận động viên cho "${row.name}"${row.memberNumber ? ` (mã hội viên ${row.memberNumber})` : ""} — hãy gán mã VPF hoặc bỏ qua dòng này`,
          },
      })
    } else if (seen.has(match.vpfId)) {
      issues.push({
        severity: "error",
        code: "athlete.duplicate",
        message: {
          en: `${match.vpfId} appears more than once in this file; a meet can hold only one result per athlete`,
          vi: `${match.vpfId} xuất hiện nhiều lần trong tệp; mỗi vận động viên chỉ có một kết quả cho một giải`,
        },
      })
    }
    if (match.vpfId) seen.add(match.vpfId)

    // `teams.teamName` is unique and nothing else in the app writes the table, so
    // the importer creates missing teams — which is also the one place it can
    // quietly make a mess, hence the explicit "will create" line in the preview.
    let teamId: number | null = null
    let createsTeam: string | null = null
    if (row.team) {
      const existingTeamId = teamIdByName.get(row.team)
      if (existingTeamId !== undefined) {
        teamId = existingTeamId
      } else {
        createsTeam = row.team
        teamsToCreate.add(row.team)
      }
    }

    const blocking = issues.some((issue) => issue.severity === "error")
    const existing = match.vpfId ? existingByVpfId.get(match.vpfId) ?? null : null

    // `ranked` and `showOnProfile` have no CSV source and must survive a re-import,
    // or an admin's deliberate un-ranking is undone by the next one (§3.5).
    // `RANKED_DIVISION` excludes `guest`, so guest rows import unranked.
    const ranked = existing?.ranked ?? (row.division ? RANKED_DIVISION.includes(row.division) : true)
    const showOnProfile = existing?.showOnProfile ?? true

    const values = blocking ? null : toStoredValues(row, teamId)
    const changes = values ? diffStored(existing ? pickStored(existing) : null, values) : []

    let action: RowAction
    if (blocking) action = "skip"
    else if (!existing) action = "create"
    else if (changes.length === 0) action = "unchanged"
    else action = "update"

    previews.push({
      row: { ...row, issues },
      match,
      derived: emptyDerived(),
      action,
      changes,
      createsTeam,
    })

    if (values && match.vpfId) {
      writes.push({
        lineNumber: row.lineNumber,
        vpfId: match.vpfId,
        values,
        ranked,
        showOnProfile,
        isNew: !existing,
        pendingTeamName: createsTeam,
      })
    }
  }

  // ---- Derived state, using the production ranking code so the preview shows
  // exactly what the public page will show once committed. ----
  attachDerived(meet, previews, writes)

  // Rows already in meet_results and absent from the CSV must actually disappear:
  // a withdrawn lifter is gone, not stale (§3.5).
  const keptVpfIds = new Set(writes.map((write) => write.vpfId))
  const deletionRows = existingRows.filter((row) => !keptVpfIds.has(row.vpfId))
  const deletionNames = deletionRows.length === 0
    ? []
    : await db
      .select({ vpfId: users.vpfId, fullName: users.fullName })
      .from(users)
      .where(inArray(users.vpfId, deletionRows.map((row) => row.vpfId)))
  const nameByVpfId = new Map(deletionNames.map((row) => [row.vpfId, row.fullName]))

  const deletions: ImportDeletion[] = deletionRows.map((row) => ({
    vpfId: row.vpfId,
    fullName: nameByVpfId.get(row.vpfId) ?? row.vpfId,
    division: row.division,
    weightClass: row.weightClass,
  }))

  const errors = previews.reduce((n, p) => n + p.row.issues.filter((i) => i.severity === "error").length, 0)
  const warnings = previews.reduce((n, p) => n + p.row.issues.filter((i) => i.severity === "warning").length, 0)

  return {
    preview: {
      meetId: meet.meetId,
      meetName: meet.meetName,
      checksum,
      rows: previews,
      deletions,
      teamsToCreate: [...teamsToCreate],
      counts: {
        create: previews.filter((p) => p.action === "create").length,
        update: previews.filter((p) => p.action === "update").length,
        unchanged: previews.filter((p) => p.action === "unchanged").length,
        delete: deletions.length,
        skip: previews.filter((p) => p.action === "skip").length,
        errors,
        warnings,
      },
      blocked: errors > 0,
      issues: [],
    },
    writes,
    deletions: deletionRows.map((row) => row.vpfId),
    teamsToCreate: [...teamsToCreate],
  }
}

/**
 * Run the resolved rows through the same `addMetadataToMeetResults` the public
 * pages use, so the preview's best lifts, total, GL points and placement are the
 * real ones rather than a second implementation that can disagree.
 */
function attachDerived(meet: MeetRow, previews: ImportRowPreview[], writes: ImportWrite[]): void {
  if (writes.length === 0) return

  const rawResults = writes.map((write): ResultRaw => ({
    resultId: `preview-${write.lineNumber}`,
    meetId: meet.meetId,
    vpfId: write.vpfId,
    ...write.values,
    bodyWeight: write.values.bodyWeight ?? null,
    ranked: write.ranked,
    showOnProfile: write.showOnProfile,
  } as ResultRaw))

  const derived = addMetadataToMeetResults(rawResults)
  const previewByLine = new Map(previews.map((preview) => [preview.row.lineNumber, preview]))

  writes.forEach((write, i) => {
    const preview = previewByLine.get(write.lineNumber)
    const result = derived[i]
    if (!preview || !result) return

    preview.derived = {
      bestSquat: result.bestSquat,
      bestBench: result.bestBench,
      bestDeadlift: result.bestDeadlift,
      total: result.total,
      gl: result.gl,
      placement: result.placement,
      disqualified: result.placement === DISQUALIFIED,
      dqReasons: result.placement === DISQUALIFIED
        ? describeDisqualification(
          result.bestSquat, result.bestBench, result.bestDeadlift,
          write.values.bodyWeight ?? null, write.values.weightClass, write.values.sex, write.ranked,
        )
        : [],
    }

    // Placement is computed within (sex, division, weightClass), so a disagreement
    // with LiftingCast's Place points at a division or weight-class mapping error.
    const reportedPlace = preview.row.reported.place
    if (reportedPlace !== null && !preview.derived.disqualified && reportedPlace !== result.placement) {
      preview.row.issues.push({
        severity: "warning",
        code: "place.mismatch",
        message: {
          en: `Placement disagrees: LiftingCast says ${reportedPlace}, VPF computes ${result.placement}`,
          vi: `Thứ hạng không khớp: LiftingCast là ${reportedPlace}, VPF tính ${result.placement}`,
        },
      })
    }
  })

  // The warnings above are counted by the caller, which runs after this.
}

/**
 * Commit a context: upsert on `(meetId, vpfId)` plus a delete of the rows the CSV
 * omitted, in one transaction.
 *
 * That makes the import a **declarative replace** of the meet's results, which is
 * what makes re-importing a corrected file converge and re-importing the same file
 * a no-op — meets do get re-exported after corrections, and the correction path is
 * re-import rather than a hand-editing screen that could make the site disagree
 * with the meet's official record.
 */
export async function applyImport(meet: MeetRow, context: ImportContext): Promise<ImportResult> {
  const { writes, deletions, teamsToCreate } = context

  return db.transaction(async (tx) => {
    const teamIdByName = new Map<string, number>()
    for (const teamName of teamsToCreate) {
      // onConflictDoUpdate rather than DoNothing so the id comes back either way,
      // including when a concurrent import created the team first.
      const [team] = await tx
        .insert(teams)
        .values({ teamName })
        .onConflictDoUpdate({ target: teams.teamName, set: { teamName } })
        .returning({ teamId: teams.teamId, teamName: teams.teamName })
      // The upsert always returns a row; bail loudly rather than writing a null
      // team id onto every result that referenced this team.
      if (!team) throw new Error(`Failed to resolve team "${teamName}" during results import`)
      teamIdByName.set(team.teamName, team.teamId)
    }

    let created = 0
    let updated = 0
    for (const write of writes) {
      const values = write.pendingTeamName
        ? { ...write.values, teamId: teamIdByName.get(write.pendingTeamName) ?? write.values.teamId }
        : write.values

      await tx
        .insert(meetResults)
        .values({
          meetId: meet.meetId,
          vpfId: write.vpfId,
          ...values,
          ranked: write.ranked,
          showOnProfile: write.showOnProfile,
        })
        .onConflictDoUpdate({
          target: [meetResults.meetId, meetResults.vpfId],
          // `ranked` and `showOnProfile` are deliberately absent from the update:
          // they have no CSV source, and resetting them would undo an admin's
          // deliberate un-ranking on every re-import.
          set: values,
        })
      if (write.isNew) created++
      else updated++
    }

    if (deletions.length > 0) {
      await tx
        .delete(meetResults)
        .where(and(eq(meetResults.meetId, meet.meetId), inArray(meetResults.vpfId, deletions)))
    }

    return {
      meetId: meet.meetId,
      created,
      updated,
      deleted: deletions.length,
      teamsCreated: teamsToCreate,
      systemYear: meet.systemYear,
    }
  })
}

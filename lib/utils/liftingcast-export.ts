/**
 * The outbound half of the LiftingCast round trip (admin tools spec §6.3).
 *
 * Pure: rows in, CSV text out. Every enum translation here goes through
 * `lib/utils/liftingcast-mapping.ts`, which is the same table the importer reads —
 * if the two drift, a meet exports as "Masters 1", fails to import as `mas1`, and
 * the failure surfaces days later with the results in hand.
 */
import { formatDivision, formatSex, formatWeightClass } from "~/lib/utils/liftingcast-mapping"
import type { MeetEntryWithAthlete } from "~/types/entries"

/** The 29 columns LiftingCast's entry import expects, in exactly this order. */
export const ENTRY_EXPORT_COLUMNS = [
  "name",
  "team",
  "lot",
  "platform",
  "session",
  "flight",
  "birthDate",
  "memberNumber",
  "gender",
  "rawOrEquipped",
  "division",
  "declaredAwardsWeightClass",
  "bodyWeight",
  "squatRackHeight",
  "benchRackHeight",
  "squat1",
  "bench1",
  "dead1",
  "wasDrugTested",
  "phoneNumber",
  "country",
  "streetAddress",
  "city",
  "state",
  "zipCode",
  "email",
  "emergencyContactName",
  "emergencyContactPhoneNumber",
  "additionalItems",
] as const

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text
}

/**
 * `users.dob` is a smallint year and VPF holds no full date of birth anywhere
 * (§6.4, §11.3), so the export can only emit a year-derived placeholder. That
 * makes LiftingCast's `Exact Age`, `Age Coef` and age-adjusted points wrong for
 * anyone whose birthday falls after the meet.
 *
 * VPF's own logic is unaffected — divisions come from `systemYear - dob` and the
 * importer ignores every age column — so this is tolerable for a meet with no
 * Masters awards and quietly wrong for one with them.
 */
export function birthDatePlaceholder(dob: number | null): string {
  return dob === null ? "" : `${dob}-01-01`
}

/**
 * LiftingCast takes two rack settings; `users` holds four. The bench safety pin
 * and foot block have no target column, so they are folded in here as text rather
 * than dropped — the platform crew still needs them.
 */
export function buildAdditionalItems(entry: MeetEntryWithAthlete): string {
  const parts: string[] = []
  if (entry.benchSafetyPin) parts.push(`Bench safety pin: ${entry.benchSafetyPin}`)
  if (entry.benchFootBlock) parts.push(`Bench foot block: ${entry.benchFootBlock}`)
  if (entry.additionalItems) parts.push(entry.additionalItems)
  return parts.join("; ")
}

export function buildEntryExportRow(entry: MeetEntryWithAthlete): Record<string, string | number | null> {
  return {
    name: entry.fullName,
    team: entry.teamName,
    lot: entry.lot,
    platform: entry.platform,
    session: entry.session,
    flight: entry.flight,
    birthDate: birthDatePlaceholder(entry.dob),
    // The join key that brings results home (§3.3). Non-negotiable.
    memberNumber: entry.vpfId,
    gender: formatSex(entry.sex),
    rawOrEquipped: entry.rawOrEquipped,
    division: formatDivision(entry.division),
    declaredAwardsWeightClass: formatWeightClass(entry.weightClass, entry.sex),
    // Weigh-in happens in LiftingCast, and the bodyweight comes back in the
    // results CSV (§12.4).
    bodyWeight: "",
    squatRackHeight: entry.squatRackPin,
    benchRackHeight: entry.benchRackPin,
    squat1: entry.squatOpener,
    bench1: entry.benchOpener,
    dead1: entry.deadliftOpener,
    wasDrugTested: entry.wasDrugTested ? "true" : "false",
    phoneNumber: entry.phoneNumber,
    country: entry.nationality,
    // `users.address` is one free-text field, so it maps whole and the three
    // structured columns export empty. The export can never be a source of
    // structured address data.
    streetAddress: entry.address,
    city: "",
    state: "",
    zipCode: "",
    email: entry.email,
    // Never collected anywhere — a genuine safety gap for a strength sport (§12.5).
    emergencyContactName: "",
    emergencyContactPhoneNumber: "",
    additionalItems: buildAdditionalItems(entry),
  }
}

/** Withdrawn entries are excluded — a withdrawal is a fact, but not a start list row. */
export function buildEntryExportCsv(entries: MeetEntryWithAthlete[]): string {
  const lines = [ENTRY_EXPORT_COLUMNS.join(",")]
  for (const entry of entries) {
    if (entry.withdrawn) continue
    const row = buildEntryExportRow(entry)
    lines.push(ENTRY_EXPORT_COLUMNS.map((column) => escapeCsv(row[column])).join(","))
  }
  return `${lines.join("\n")}\n`
}

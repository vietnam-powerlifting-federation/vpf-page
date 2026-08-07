/**
 * The two directions of the VPF ↔ LiftingCast vocabulary, driven from the single
 * set of tables in `lib/constants/liftingcast.ts`.
 *
 * Every `parseX` here is the inverse of the matching `formatX`. That is asserted
 * rather than assumed: if the pair drifts, a meet exports fine and fails to come
 * back in, and the failure surfaces days later with the results in hand.
 */
import {
  DIVISION_ALIASES,
  DIVISION_EXPORT_LABEL,
  DIVISION_IGNORED_PREFIX_TOKENS,
  SEX_ALIASES,
  SEX_EXPORT_LABEL,
  UNLIMITED_CLASS_LABEL,
  UNLIMITED_WEIGHT_CLASS,
} from "~/lib/constants/liftingcast"
import { WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import type { Division, Sex } from "~/types/union-types"

/**
 * Lowercase, punctuation → space, whitespace collapsed.
 *
 * Apostrophes are deleted rather than spaced, so "Men's" normalises to the single
 * token "mens" and can be recognised as a sex prefix — spacing it would leave a
 * stray "s" in front of the division name.
 */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/**
 * Normalise a LiftingCast division name to a lookup key: the punctuation-stripped
 * name with any leading sex/equipment tokens removed, so "Men's Raw Sub-Junior"
 * and "Sub-Junior" both key on "sub junior".
 */
export function normalizeDivisionName(raw: string): string {
  const tokens = normalize(raw).split(" ").filter(Boolean)
  // Never strip the last token: "Men" on its own must stay "men" and fail to
  // match, rather than collapsing to an empty string that matches nothing useful.
  while (tokens.length > 1 && DIVISION_IGNORED_PREFIX_TOKENS.includes(tokens[0] ?? "")) {
    tokens.shift()
  }
  return tokens.join(" ")
}

/** LiftingCast division name → VPF division, or null when unrecognised (a blocking error). */
export function parseDivision(raw: string | null | undefined): Division | null {
  if (!raw) return null
  return DIVISION_ALIASES[normalizeDivisionName(raw)] ?? null
}

/** VPF division → the one label the entries export emits. */
export function formatDivision(division: Division): string {
  return DIVISION_EXPORT_LABEL[division]
}

export function weightClassesFor(sex: Sex): number[] {
  return sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE
}

/**
 * LiftingCast may render a class as `74`, `-74`, `74kg` or `120+`. Strip a leading
 * minus and map a trailing `+` to the 999 sentinel, then validate against the
 * sex's array — an invalid pair is a blocking error, because the `chk_weight_class_sex`
 * check constraint would reject the insert anyway and failing in the preview is
 * far kinder than failing mid-transaction.
 */
export function parseWeightClass(raw: string | null | undefined, sex: Sex): number | null {
  if (raw == null) return null
  const cleaned = raw.trim().toLowerCase().replace(/kg\s*$/, "").replace(/^-/, "").trim()
  if (!cleaned) return null

  const unlimited = cleaned.endsWith("+")
  const numeric = Number.parseFloat(unlimited ? cleaned.slice(0, -1) : cleaned)
  if (Number.isNaN(numeric)) return null

  const weightClass = unlimited ? UNLIMITED_WEIGHT_CLASS : numeric
  return weightClassesFor(sex).includes(weightClass) ? weightClass : null
}

/** VPF weight class → LiftingCast label; the 999 sentinel becomes `120+` / `84+`. */
export function formatWeightClass(weightClass: number, sex: Sex): string {
  return weightClass === UNLIMITED_WEIGHT_CLASS ? UNLIMITED_CLASS_LABEL[sex] : String(weightClass)
}

/** LiftingCast gender → VPF sex. Unmappable values are rejected: the DB check constraint ties weight class to sex. */
export function parseSex(raw: string | null | undefined): Sex | null {
  if (!raw) return null
  return SEX_ALIASES[normalize(raw)] ?? null
}

export function formatSex(sex: Sex): string {
  return SEX_EXPORT_LABEL[sex]
}

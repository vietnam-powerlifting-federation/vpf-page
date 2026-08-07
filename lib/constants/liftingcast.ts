/**
 * The vocabulary VPF and LiftingCast share.
 *
 * LiftingCast owns the platform during a meet; this site owns the public record.
 * They exchange CSV in both directions (entries out, results back), so every enum
 * translation here is used by *both* the importer (§3.2) and the exporter (§6.3).
 * Keeping one table for the pair is what stops a meet exporting as "Masters 1"
 * and failing to import as `mas1` days later with the results in hand.
 *
 * The functions that read these tables live in `lib/utils/liftingcast-mapping.ts`.
 */
import type { Division, Sex } from "~/types/union-types"

/**
 * Tokens LiftingCast division names carry as prefixes that VPF's `division` enum
 * does not model: the athlete's sex (already its own column) and the equipment
 * category (§12.2 — no schema home, and the `Raw/Equipped` column is the source
 * of truth for it). Stripped from the front of a name before lookup, so
 * "Men's Raw Junior" and "Junior" both resolve to `jr`.
 */
export const DIVISION_IGNORED_PREFIX_TOKENS = [
  "mens", "men", "womens", "women", "male", "female", "mixed",
  "raw", "classic", "equipped", "eq", "geared",
]

/**
 * Normalised LiftingCast division name → VPF `division`. Keys are the output of
 * `normalizeDivisionName`: lowercased, punctuation replaced by spaces, collapsed.
 *
 * Deliberately an explicit list. An unrecognised name is a blocking error naming
 * the exact string, never a guess — the right fix is to correct the division in
 * LiftingCast and re-export, which keeps the two vocabularies converging rather
 * than drifting behind a translation layer.
 */
export const DIVISION_ALIASES: Record<string, Division> = {
  "sub junior": "subjr",
  "subjunior": "subjr",
  "sub jr": "subjr",
  "subjr": "subjr",

  "junior": "jr",
  "jr": "jr",

  "open": "open",
  "senior": "open",

  "masters 1": "mas1",
  "master 1": "mas1",
  "masters i": "mas1",
  "master i": "mas1",
  "mas1": "mas1",
  "m1": "mas1",

  "masters 2": "mas2",
  "master 2": "mas2",
  "masters ii": "mas2",
  "master ii": "mas2",
  "mas2": "mas2",
  "m2": "mas2",

  "masters 3": "mas3",
  "master 3": "mas3",
  "masters iii": "mas3",
  "master iii": "mas3",
  "mas3": "mas3",
  "m3": "mas3",

  "masters 4": "mas4",
  "master 4": "mas4",
  "masters iv": "mas4",
  "master iv": "mas4",
  "mas4": "mas4",
  "m4": "mas4",

  "guest": "guest",
}

/**
 * The one label the exporter emits per division — the exact inverse of the table
 * above. Every value here must normalise back to its own key; `test/unit/
 * liftingcast-mapping.test.ts` asserts that round trip for all eight divisions.
 */
export const DIVISION_EXPORT_LABEL: Record<Division, string> = {
  subjr: "Sub-Junior",
  jr: "Junior",
  open: "Open",
  mas1: "Masters 1",
  mas2: "Masters 2",
  mas3: "Masters 3",
  mas4: "Masters 4",
  guest: "Guest",
}

/** LiftingCast writes sex uppercase in its results export. */
export const SEX_EXPORT_LABEL: Record<Sex, string> = {
  male: "MALE",
  female: "FEMALE",
}

export const SEX_ALIASES: Record<string, Sex> = {
  male: "male",
  m: "male",
  man: "male",
  men: "male",
  female: "female",
  f: "female",
  woman: "female",
  women: "female",
}

/**
 * VPF stores the unlimited class as 999; LiftingCast renders it as the previous
 * class with a "+". The pair below is what `formatWeightClass` emits for 999.
 */
export const UNLIMITED_WEIGHT_CLASS = 999

export const UNLIMITED_CLASS_LABEL: Record<Sex, string> = {
  male: "120+",
  female: "84+",
}

/** The only equipment category VPF sanctions. Rows in any other category are rejected (§3.1). */
export const SUPPORTED_EQUIPMENT = "raw"

import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, MIN_COMPETITION_AGE } from "~/lib/constants/constants"
import type { Sex, RankedDivision } from "~/types/union-types"

/**
 * Competition-entry eligibility derived from an athlete's real data.
 * Pure functions (no I/O), safe to use on both the server and the client so the
 * wizard and the registration endpoint agree on the valid options.
 */

/** Real age at competition time: birth year (`users.dob`) against the meet's `systemYear`. */
export function computeCompetitionAge(dob: number, systemYear: number): number {
  return systemYear - dob
}

/**
 * Ranked divisions an athlete of the given age may enter, per IPF age brackets.
 * Open is always available from the minimum age; the age-specific bracket is added
 * on top (e.g. age 20 → [jr, open], age 45 → [mas1, open], age 30 → [open]).
 * Returns [] when the athlete is below the minimum competition age.
 */
export function getEligibleDivisions(age: number): RankedDivision[] {
  if (age < MIN_COMPETITION_AGE) return []
  const divisions: RankedDivision[] = ["open"]
  if (age >= 14 && age <= 18) divisions.unshift("subjr")
  else if (age >= 19 && age <= 23) divisions.unshift("jr")
  else if (age >= 40 && age <= 49) divisions.unshift("mas1")
  else if (age >= 50 && age <= 59) divisions.unshift("mas2")
  else if (age >= 60 && age <= 69) divisions.unshift("mas3")
  else if (age >= 70) divisions.unshift("mas4")
  return divisions
}

/** Weight classes valid for a sporting gender. Age does not further restrict them. */
export function getEligibleWeightClasses(sex: Sex): number[] {
  return sex === "male" ? [...WEIGHT_CLASS_MALE] : [...WEIGHT_CLASS_FEMALE]
}

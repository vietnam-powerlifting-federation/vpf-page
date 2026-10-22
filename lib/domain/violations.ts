import type { ViolationOutcome } from "~/types/competitions"

/**
 * The violation level rule (admin tools spec §5.1), in one place.
 *
 * An athlete's level is the *count* of their violation rows still in force for a
 * given year — `expireYear >= year`, or `expireYear IS NULL` meaning never. Level
 * ≥ 2 blocks registration outright; level 1 lets the athlete continue but requires
 * a written pledge and a fine.
 *
 * Pure and isomorphic on purpose. The admin console previews the consequence of
 * recording a violation *before* it is saved, and the registration endpoint
 * enforces it afterwards; both read these functions so the preview cannot promise
 * one outcome and the server apply another.
 */
export function outcomeForLevel(level: number): ViolationOutcome {
  if (level >= 2) return "blocked"
  if (level === 1) return "pledge"
  return "ok"
}

/** A violation counts against an athlete until its expiry year has passed; null never expires. */
export function isInForce(expireYear: number | null, referenceYear: number): boolean {
  return expireYear === null || expireYear >= referenceYear
}

import { and, eq, isNull, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations } from "~/lib/external/drizzle/migrations/schema"
import type { I18nMessage } from "~/server/utils/api-response"
import type { ViolationOutcome } from "~/types/competitions"

/**
 * The violation level rule, in one place (admin tools spec §5.1).
 *
 * An athlete's level is the *count* of their violation rows still in force for a
 * given year — `expireYear >= year`, or `expireYear IS NULL` meaning never. Level
 * ≥ 2 blocks registration outright; level 1 lets the athlete continue but requires
 * a written pledge and a fine.
 *
 * `evaluateBanGates` applies the same rule at registration time; this is the read
 * side, used to show staff the consequence of what they are about to record.
 */
export function outcomeForLevel(level: number): ViolationOutcome {
  if (level >= 2) return "blocked"
  if (level === 1) return "pledge"
  return "ok"
}

export function isInForce(expireYear: number | null, referenceYear: number): boolean {
  return expireYear === null || expireYear >= referenceYear
}

/** Count an athlete's violations still in force for `referenceYear`. */
export async function violationLevel(vpfId: string, referenceYear: number): Promise<number> {
  const rows = await db
    .select({ id: userViolations.id })
    .from(userViolations)
    .where(and(
      eq(userViolations.vpfId, vpfId),
      or(isNull(userViolations.expireYear), sql`${userViolations.expireYear} >= ${referenceYear}`),
    ))
  return rows.length
}

export const VIOLATIONS_FORBIDDEN: I18nMessage = {
  en: "Only admins can manage violations",
  vi: "Chỉ quản trị viên mới có thể quản lý vi phạm",
}

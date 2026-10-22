import { and, eq, isNull, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations } from "~/lib/external/drizzle/migrations/schema"
import type { I18nMessage } from "~/server/utils/api-response"

/**
 * The level rule itself is pure and shared with the admin console — see
 * `lib/domain/violations`. This module is the read side: counting an athlete's
 * violations so staff can be shown what recording another one would mean.
 */
export { isInForce, outcomeForLevel } from "~/lib/domain/violations"

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

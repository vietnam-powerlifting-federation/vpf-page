import type { InferSelectModel } from "drizzle-orm"
import type { competitionBanList, userViolations } from "~/lib/external/drizzle/migrations/schema"
import type { ViolationOutcome } from "~/types/competitions"

export type UserViolation = InferSelectModel<typeof userViolations>

/**
 * A violation row with the athlete it belongs to and the consequence it currently
 * carries (admin tools spec §5.1).
 *
 * The athlete's *level is the row count* still in force — `expireYear >= systemYear`,
 * or `expireYear IS NULL` — so a single row means nothing on its own. `level` and
 * `outcome` are computed against a reference year and returned alongside, because
 * that rule is not obvious from a list of rows.
 */
export type UserViolationWithUser = UserViolation & {
  userName: string
  userEmail: string | null
  level: number
  outcome: ViolationOutcome
}

/** What setting a violation would do, previewed live as the admin types (§5.1). */
export type ViolationImpact = {
  vpfId: string
  userName: string
  referenceYear: number
  currentLevel: number
  projectedLevel: number
  currentOutcome: ViolationOutcome
  projectedOutcome: ViolationOutcome
}

export type CompetitionBan = InferSelectModel<typeof competitionBanList>

/**
 * A ban-list row with the two names needed to render the athlete-facing notice.
 *
 * The reason is shown to the athlete **verbatim**, so the admin is authoring
 * public-facing Vietnamese inside a data field and must see the result. The
 * preview is rendered client-side from the same
 * `competitionRegistration.blockedCompetitionBan` key the registration wizard
 * uses — duplicating the sentence on the server would let the two drift.
 */
export type CompetitionBanWithUser = CompetitionBan & {
  userName: string
  meetName: string
}

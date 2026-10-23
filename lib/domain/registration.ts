import type { RegistrationEligibility } from "~/types/competitions"

type Translate = (key: string, params?: Record<string, unknown>) => string

export const REGISTRATION_STEPS = ["identity", "capacity", "details", "review", "payment", "done"] as const
export type RegistrationStep = typeof REGISTRATION_STEPS[number]

/**
 * What stops an athlete from starting to register, checked in this order, or null when nothing does.
 * Ban results are only present once identity is verified.
 */
export function registrationGate(e: RegistrationEligibility): "closed" | "registered" | "email" | "blocked" | null {
  if (!e.registrationOpen) return "closed"
  if (e.alreadyRegistered) return "registered"
  if (!e.emailVerified) return "email"
  if (e.bans?.blocked) return "blocked"
  return null
}

/** Why a blocked athlete cannot register, in plain words. */
export function registrationBlockMessage(e: RegistrationEligibility, t: Translate): string {
  if (!e.bans) return ""
  if (e.bans.violationOutcome === "blocked") return t("competitionRegistration.blockedViolation")
  if (e.bans.dopingBanned) return t("competitionRegistration.blockedDoping")
  if (e.bans.competitionBanned) {
    return t("competitionRegistration.blockedCompetitionBan", { meet: e.meet.meetName, reason: e.bans.competitionBanReason ?? "" })
  }
  return ""
}

/** What this registration owes: the entry fee, the membership if it is owed to a member, and Media Plus if chosen. */
export function registrationFees(e: RegistrationEligibility | null, capacity: "member" | "guest", mediaPlus: boolean) {
  const entryFee = e?.fees.entryFee ?? 0
  const membershipFee = e && capacity === "member" && e.athlete.membershipOwed ? e.fees.membershipFee : 0
  const mediaPlusFee = mediaPlus ? (e?.fees.mediaPlusFee ?? 0) : 0
  return { entryFee, membershipFee, mediaPlusFee, total: entryFee + membershipFee + mediaPlusFee }
}

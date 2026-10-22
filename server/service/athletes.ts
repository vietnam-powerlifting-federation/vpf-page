import { getPersonalBestSummary } from "~/lib/domain/results"
import { isVipActive } from "~/lib/domain/vip"
import type { JwtPayload } from "~/lib/external/jwt"
import {
  findAthletePrivate,
  findAthletePublic,
  findVipBenefits,
  findVipExpiry,
  findVpfIdBySlug,
} from "~/server/repository/athletes"
import { getMeetsAndResultsAndAthletes } from "~/server/repository/dataset"
import { getAthleteRecordStatus } from "~/server/service/records"
import type { AthleteProfileData, AthleteRecordData } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

export type AthleteIdResolution =
  | { ok: true; vpfId: string; isSelf: boolean }
  | { ok: false; reason: "unauthenticated" | "not-found" }

/**
 * Resolve the `[id]` segment of an athlete route to a VPF id.
 *
 * `[id]` is one of three things: the literal `me`, a `VPF…` id, or a profile
 * slug. Every route under /api/athletes used to decide this for itself and they
 * disagreed — the profile read accepted slugs, while purchases and vip-settings
 * treated the segment as a raw VPF id, so `/api/athletes/{slug}/purchases`
 * quietly looked up an athlete that could not exist. One resolver means one
 * answer, and the 401-vs-404 distinction stops being re-derived per handler.
 */
export async function resolveAthleteId(
  idParam: string,
  currentUser: JwtPayload | null,
): Promise<AthleteIdResolution> {
  if (idParam === "me") {
    // "me" is only meaningful with a session; without one this is not a missing
    // athlete, it is a missing caller.
    return currentUser?.vpfId
      ? { ok: true, vpfId: currentUser.vpfId, isSelf: true }
      : { ok: false, reason: "unauthenticated" }
  }

  const vpfId = idParam.startsWith("VPF") ? idParam : await findVpfIdBySlug(idParam)
  if (!vpfId) return { ok: false, reason: "not-found" }

  return { ok: true, vpfId, isSelf: currentUser?.vpfId === vpfId }
}

/** An athlete sees their own record in full; so does an admin. Everyone else gets the public columns. */
export type AthleteScope = "private" | "public"

export function scopeFor(isSelf: boolean, isAdmin: boolean): AthleteScope {
  return isSelf || isAdmin ? "private" : "public"
}

/**
 * Both response shapes are declared in `types/users` so the pages can name them
 * without importing from `server/`.
 */
export type AthleteRecord = AthleteRecordData
export type AthleteProfile = AthleteProfileData

/**
 * VIP settings only apply while the membership is live — an expired one reverts
 * the profile to its normal appearance rather than keeping the decorations.
 */
async function getActiveVipSettings(vpfId: string): Promise<VipBenefits | null> {
  const expiresAt = await findVipExpiry(vpfId)
  if (!isVipActive(expiresAt)) return null
  return findVipBenefits(vpfId)
}

/**
 * One athlete's record — a single row, plus the VIP settings that decorate it.
 *
 * Deliberately does not touch meets or results. This is what the header, the
 * profile form and the admin editor all read, and it is requested on virtually
 * every page load; joining a competition history onto it made the most frequent
 * read in the app also the most expensive one, for data none of those callers used.
 * The history lives in `getAthleteProfile` instead.
 *
 * The returned `scope` is a discriminant, so a caller cannot read a private
 * column off a record the server decided to answer publicly.
 */
export async function getAthleteRecord(
  vpfId: string,
  scope: AthleteScope,
): Promise<AthleteRecord | null> {
  const vipSettings = await getActiveVipSettings(vpfId)

  if (scope === "private") {
    const athlete = await findAthletePrivate(vpfId)
    return athlete ? { scope: "private", athlete, vipSettings } : null
  }

  const athlete = await findAthletePublic(vpfId)
  return athlete ? { scope: "public", athlete, vipSettings } : null
}

/**
 * The public profile page: an athlete's competition history, personal bests and
 * record standings.
 *
 * Hidden meets are excluded unconditionally. They are unpublished drafts, and
 * this used to be opt-in through an `excludeHidden` query flag that no caller
 * ever passed — so a draft's existence leaked through the profile of anyone
 * entered in it.
 *
 * Always the public column set, whoever asks: this is the "profile page" shape,
 * and a caller wanting their own private record has `getAthleteRecord`.
 */
export async function getAthleteProfile(vpfId: string): Promise<AthleteProfile | null> {
  const athlete = await findAthletePublic(vpfId)
  if (!athlete) return null

  const [dataset, records, vipSettings] = await Promise.all([
    getMeetsAndResultsAndAthletes({ vpfIds: [vpfId], hidden: false }),
    getAthleteRecordStatus(vpfId),
    getActiveVipSettings(vpfId),
  ])

  // Most recent meet first; meet ids increase over time.
  const compHistory = [...dataset.results].sort((a, b) => b.meetId - a.meetId)

  return {
    athlete,
    personalBest: getPersonalBestSummary(dataset.results),
    compHistory,
    meets: dataset.meets,
    records,
    vipSettings,
  }
}

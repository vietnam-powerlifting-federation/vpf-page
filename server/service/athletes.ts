import { getPersonalBestSummary } from "~/lib/domain/results"
import { isVipActive } from "~/lib/domain/vip"
import type { JwtPayload } from "~/lib/external/jwt"
import {
  findAthletePrivate,
  findAthletePublic,
  findVipBenefits,
  findVipExpiry,
  findUserIdByHandle,
} from "~/server/repository/athletes"
import { getMeetsAndResultsAndAthletes } from "~/server/repository/dataset"
import { getAthleteRecordStatus } from "~/server/service/records"
import type { AthleteProfileData, AthleteRecordData } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

export type AthleteIdResolution =
  | { ok: true; userId: string; isSelf: boolean }
  | { ok: false; reason: "unauthenticated" | "not-found" }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether a string is shaped like a `users.userId`, so it can be compared to a uuid column without a cast error. */
export function isUserId(value: string): boolean {
  return UUID_PATTERN.test(value)
}

/**
 * Resolve the `[id]` segment of an athlete route to a user id.
 *
 * `[id]` is one of four things: the literal `me`, a user id, a `VPF…` id, or a
 * profile slug. The last two are the public handles every existing link uses. Every route under /api/athletes used to decide this for itself and they
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
    return currentUser?.userId
      ? { ok: true, userId: currentUser.userId, isSelf: true }
      : { ok: false, reason: "unauthenticated" }
  }

  const userId = isUserId(idParam)
    ? await findUserIdByHandle({ userId: idParam })
    : await findUserIdByHandle(idParam.startsWith("VPF") ? { vpfId: idParam } : { slug: idParam })
  if (!userId) return { ok: false, reason: "not-found" }

  return { ok: true, userId, isSelf: currentUser?.userId === userId }
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
async function getActiveVipSettings(userId: string): Promise<VipBenefits | null> {
  const expiresAt = await findVipExpiry(userId)
  if (!isVipActive(expiresAt)) return null
  return findVipBenefits(userId)
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
  userId: string,
  scope: AthleteScope,
): Promise<AthleteRecord | null> {
  const vipSettings = await getActiveVipSettings(userId)

  if (scope === "private") {
    const athlete = await findAthletePrivate(userId)
    return athlete ? { scope: "private", athlete, vipSettings } : null
  }

  const athlete = await findAthletePublic(userId)
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
export async function getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  const athlete = await findAthletePublic(userId)
  if (!athlete) return null

  const [dataset, records, vipSettings] = await Promise.all([
    getMeetsAndResultsAndAthletes({ userIds: [userId], hidden: false }),
    getAthleteRecordStatus(userId),
    getActiveVipSettings(userId),
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

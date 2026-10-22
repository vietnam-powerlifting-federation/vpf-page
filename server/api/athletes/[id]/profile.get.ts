import { getAthleteProfile, resolveAthleteId, type AthleteProfile } from "~/server/service/athletes"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"

/**
 * An athlete's public profile: competition history, personal bests and record
 * standings. `[id]` is `me`, a VPF id, or a profile slug, exactly as elsewhere.
 *
 * Split out from the record endpoint because this is the expensive shape — it
 * joins meets and results — and only the profile page and the athlete's own
 * competition list need it. Every field is always present; the `includeRecords`
 * and `includeVipSettings` flags this replaced made the response type a function
 * of the query string, which no caller could express.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<AthleteProfile>> => {
  const idParam = getRouterParam(event, "id")
  if (!idParam) return fail(event, 400, MSG.invalidInput)

  const resolved = await resolveAthleteId(idParam, event.context.user ?? null)
  if (!resolved.ok) {
    return resolved.reason === "unauthenticated"
      ? fail(event, 401, MSG.unauthorized)
      : fail(event, 404, MSG.athleteNotFound)
  }

  const profile = await getAthleteProfile(resolved.vpfId)
  if (!profile) return fail(event, 404, MSG.athleteNotFound)

  return ok(profile, {
    en: "Athlete profile retrieved successfully",
    vi: "Lấy hồ sơ vận động viên thành công",
  })
})

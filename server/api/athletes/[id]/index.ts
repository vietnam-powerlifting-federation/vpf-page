import { getAthleteRecord, resolveAthleteId, scopeFor, type AthleteRecord } from "~/server/service/athletes"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"

/**
 * One athlete's record. `[id]` is `me`, a VPF id, or a profile slug.
 *
 * Returns the record only — the competition history lives at
 * `/api/athletes/[id]/profile`. This endpoint is read on nearly every page load
 * (the header resolves the session through it), so it stays a single-row read;
 * it used to join meets and results unconditionally for callers that discarded them.
 *
 * The response carries a `scope` discriminant naming which column set came back.
 * Callers needing private fields must check it: an admin page whose session has
 * expired now gets `scope: "public"` rather than a record with silently missing
 * fields that it would go on to write back.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<AthleteRecord>> => {
  const idParam = getRouterParam(event, "id")
  if (!idParam) return fail(event, 400, MSG.invalidInput)

  const currentUser = event.context.user ?? null
  const resolved = await resolveAthleteId(idParam, currentUser)
  if (!resolved.ok) {
    return resolved.reason === "unauthenticated"
      ? fail(event, 401, MSG.unauthorized)
      : fail(event, 404, MSG.athleteNotFound)
  }

  const scope = scopeFor(resolved.isSelf, currentUser?.role === "admin")
  const record = await getAthleteRecord(resolved.vpfId, scope)
  if (!record) return fail(event, 404, MSG.athleteNotFound)

  return ok(record, {
    en: "Athlete retrieved successfully",
    vi: "Lấy thông tin vận động viên thành công",
  })
})

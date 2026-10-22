import { findAthleteNameAndEmail } from "~/server/repository/violations"
import { upsertBanListEntry } from "~/server/repository/meets"
import { logger } from "~/lib/logger/logger"
import { CompetitionBanSchema } from "~/lib/zod/schemas/violations.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * Add or update a meet exclusion. `unique(meetId, vpfId)` means re-banning the
 * same athlete is an edit rather than a second row, so this upserts.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<CompetitionBanWithUser>> => {
  const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const validated = await readZodBody(event, CompetitionBanSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const { vpfId, reason } = validated.data

  const athlete = await findAthleteNameAndEmail(vpfId)

  if (!athlete) return fail(event, 404, MSG.athleteNotFound)

  const saved = await upsertBanListEntry(meet.meetId, vpfId, reason)

  logger.info("Competition ban saved", {
    meetId: meet.meetId,
    vpfId,
    savedBy: auth.user.vpfId,
  })

  return ok(
    { ...saved, userName: athlete.fullName, meetName: meet.meetName },
    { en: "Athlete added to the ban list", vi: "Đã thêm vận động viên vào danh sách hạn chế" },
  )
})

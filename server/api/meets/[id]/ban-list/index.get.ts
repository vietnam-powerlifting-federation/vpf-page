import { listBanList } from "~/server/repository/meets"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/service/competition-registration"
import { BAN_LIST_FORBIDDEN, MEET_NOT_FOUND } from "~/server/service/meet-admin"
import type { ApiResponse } from "~/types/api"
import type { CompetitionBanWithUser } from "~/types/violations"

/**
 * The per-meet exclusion list (§5.3). Meet-scoped rather than a global screen,
 * and deliberately not framed as punishment: real entries look like "already won
 * gold in the 74 class at meet X, cannot re-enter" as often as they are
 * disciplinary.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<CompetitionBanWithUser[]>> => {
  const auth = requireAdmin(event, BAN_LIST_FORBIDDEN)
  if (!auth.ok) return auth.error

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet) return fail(event, 404, MEET_NOT_FOUND)

  const rows = await listBanList(meet.meetId)

  const data: CompetitionBanWithUser[] = rows.map((row) => ({ ...row, meetName: meet.meetName }))

  return ok(data, { en: "Ban list retrieved", vi: "Lấy danh sách hạn chế thành công" })
})

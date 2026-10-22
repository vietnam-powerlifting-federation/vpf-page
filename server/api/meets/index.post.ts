import { insertMeet } from "~/server/repository/meets"
import { logger } from "~/lib/logger/logger"
import { MeetCreateSchema } from "~/lib/zod/schemas/meets.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { deriveFreeSlug, isSlugTaken, MEET_ADMIN_FORBIDDEN, SLUG_TAKEN } from "~/server/service/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

/**
 * Create a meet (§2). Until this existed every meet on the site was inserted by
 * hand-written SQL.
 */
export default defineApiHandler(async (event): Promise<ApiResponse<MeetPublic>> => {
  const auth = requireAdmin(event, MEET_ADMIN_FORBIDDEN)
  if (!auth.ok) return auth.error

  const validated = await readZodBody(event, MeetCreateSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const data = validated.data

  const meetSlug = data.meetSlug ?? await deriveFreeSlug(data.meetName)
  if (data.meetSlug && await isSlugTaken(meetSlug)) return fail(event, 409, SLUG_TAKEN)

  const created = await insertMeet({
    meetName: data.meetName,
    meetSlug,
    city: data.city ?? null,
    startRegistration: data.startRegistration ?? null,
    closeRegistration: data.closeRegistration ?? null,
    hostDate: data.hostDate ?? null,
    type: data.type ?? null,
    mediaLink: data.mediaLink ?? null,
    systemYear: data.systemYear,
    // New meets stay hidden unless explicitly published: a half-configured
    // meet on the public site is worse than one nobody can see yet.
    hidden: data.hidden ?? true,
    allowSpotterRegistration: data.allowSpotterRegistration ?? true,
    allowGuestRegistration: data.allowGuestRegistration ?? true,
    entryFee: data.entryFee ?? null,
    legacy: data.legacy ?? false,
  })

  logger.info("Meet created", { meetId: created.meetId, meetSlug, createdBy: auth.user.vpfId })

  return ok(created, { en: "Meet created", vi: "Đã tạo giải đấu" })
})

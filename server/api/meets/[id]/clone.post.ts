import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { MeetCloneSchema } from "~/lib/zod/schemas/meets.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { deriveFreeSlug, isSlugTaken, MEET_ADMIN_FORBIDDEN, MEET_NOT_FOUND, SLUG_TAKEN } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

/**
 * Clone a meet for the next edition (§2): copies everything except the dates, the
 * slug and the system year. Annual meets are near-identical year to year, and
 * this is precisely where hand-written SQL used to get copy-pasted wrong.
 *
 * The clone is always created hidden, so a half-dated copy never appears publicly.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<MeetPublic>> => {
  try {
    const auth = requireAdmin(event, MEET_ADMIN_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const source = await resolveMeet(identifier)
    if (!source) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, MeetCloneSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const data = validated.data

    const meetSlug = data.meetSlug ?? await deriveFreeSlug(data.meetName)
    if (data.meetSlug && await isSlugTaken(meetSlug)) return fail(event, 409, SLUG_TAKEN)

    const created = await db
      .insert(meets)
      .values({
        meetName: data.meetName,
        meetSlug,
        systemYear: data.systemYear,
        hostDate: data.hostDate ?? null,
        startRegistration: data.startRegistration ?? null,
        closeRegistration: data.closeRegistration ?? null,
        // Carried over from the source meet.
        city: source.city,
        type: source.type,
        mediaLink: source.mediaLink,
        entryFee: source.entryFee,
        allowGuestRegistration: source.allowGuestRegistration,
        allowSpotterRegistration: source.allowSpotterRegistration,
        legacy: source.legacy,
        hidden: true,
      })
      .returning()
      .then((rows) => rows[0])

    logger.info("Meet cloned", {
      sourceMeetId: source.meetId,
      meetId: created.meetId,
      clonedBy: auth.user.vpfId,
    })

    return ok(created, {
      en: "Meet cloned — it is hidden until you publish it",
      vi: "Đã sao chép giải đấu — giải đang ẩn cho đến khi bạn công bố",
    })
  } catch (error) {
    logger.error("Error cloning meet", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

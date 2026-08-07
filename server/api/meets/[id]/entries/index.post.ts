import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetEntries, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { DoorEntrySchema } from "~/lib/zod/schemas/entries.schema"
import { WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { MeetEntry } from "~/types/entries"

/**
 * A door entry: an athlete who turned up and paid at the venue (§6.5).
 *
 * The purchase is raised separately — `POST /api/purchases` already lets an admin
 * create one against another athlete's `vpfId` — and linked here via `purchaseId`.
 * Leaving it null is allowed so the roster is not blocked on the paperwork.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<MeetEntry>> => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, DoorEntrySchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { vpfId, sex, weightClass, division, purchaseId } = validated.data

    const validClasses = sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE
    if (!validClasses.includes(weightClass)) {
      return fail(event, 400, {
        en: `Weight class ${weightClass} is not valid for ${sex}`,
        vi: `Hạng cân ${weightClass} không hợp lệ cho giới tính ${sex === "male" ? "nam" : "nữ"}`,
      })
    }

    const athlete = await db
      .select({ vpfId: users.vpfId })
      .from(users)
      .where(eq(users.vpfId, vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!athlete) return fail(event, 404, MSG.athleteNotFound)

    // The unique constraint is the guard: `returning()` comes back empty when the
    // athlete already has an entry, which is the 409 below.
    const created = await db
      .insert(meetEntries)
      .values({
        meetId: meet.meetId,
        vpfId,
        purchaseId: purchaseId ?? null,
        sex,
        weightClass,
        division,
      })
      .onConflictDoNothing({ target: [meetEntries.meetId, meetEntries.vpfId] })
      .returning()
      .then((rows) => rows[0])

    if (!created) {
      return fail(event, 409, {
        en: "That athlete already has an entry for this meet",
        vi: "Vận động viên này đã có trong danh sách thi đấu của giải",
      })
    }

    logger.info("Door entry created", { meetId: meet.meetId, vpfId, createdBy: auth.user.vpfId })

    return ok(created, { en: "Entry added", vi: "Đã thêm lượt đăng ký" })
  } catch (error) {
    logger.error("Error creating door entry", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

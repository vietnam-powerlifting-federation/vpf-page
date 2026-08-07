import { and, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetEntries, purchases } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { EntryPatchSchema } from "~/lib/zod/schemas/entries.schema"
import { WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { ENTRIES_FORBIDDEN, MEET_NOT_FOUND } from "~/server/utils/meet-admin"
import { readZodBody } from "~/server/utils/validate"
import { releaseVouchers } from "~/server/utils/voucher-helpers"
import type { ApiResponse } from "~/types/api"
import type { MeetEntry } from "~/types/entries"

export default defineEventHandler(async (event): Promise<ApiResponse<MeetEntry>> => {
  try {
    const auth = requireAdmin(event, ENTRIES_FORBIDDEN)
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    const entryId = Number(getRouterParam(event, "entryId"))
    if (!identifier || Number.isNaN(entryId)) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, MEET_NOT_FOUND)

    const validated = await readZodBody(event, EntryPatchSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const patch = validated.data

    const entry = await db
      .select()
      .from(meetEntries)
      .where(and(eq(meetEntries.entryId, entryId), eq(meetEntries.meetId, meet.meetId)))
      .limit(1)
      .then((rows) => rows[0])

    if (!entry) return fail(event, 404, { en: "Entry not found", vi: "Không tìm thấy lượt đăng ký" })

    // The same pair the `chk_entry_weight_class_sex` constraint enforces. Checking
    // here turns a constraint violation into a message staff can act on.
    const sex = patch.sex ?? entry.sex
    const weightClass = patch.weightClass ?? entry.weightClass
    const validClasses = sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE
    if (!validClasses.includes(weightClass)) {
      return fail(event, 400, {
        en: `Weight class ${weightClass} is not valid for ${sex}`,
        vi: `Hạng cân ${weightClass} không hợp lệ cho giới tính ${sex === "male" ? "nam" : "nữ"}`,
      })
    }

    const withdrawing = patch.withdrawn === true && !entry.withdrawn

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(meetEntries)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(meetEntries.entryId, entryId))
        .returning()

      // Withdrawing hands any voucher on the registration back to the athlete;
      // cancelling silently destroys it otherwise.
      if (withdrawing && entry.purchaseId !== null) {
        await releaseVouchers(tx, entry.purchaseId)
        await tx
          .update(purchases)
          .set({ status: "cancelled", cancelledAt: new Date().toISOString() })
          .where(and(eq(purchases.purchaseId, entry.purchaseId), eq(purchases.status, "pending")))
      }

      return row
    })

    logger.info("Meet entry updated", {
      meetId: meet.meetId,
      entryId,
      updatedBy: auth.user.vpfId,
      fields: Object.keys(patch),
    })

    return ok(updated, {
      en: withdrawing ? "Entry withdrawn" : "Entry updated",
      vi: withdrawing ? "Đã rút khỏi giải" : "Đã cập nhật lượt đăng ký",
    })
  } catch (error) {
    logger.error("Error updating meet entry", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

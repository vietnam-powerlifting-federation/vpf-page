import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ViolationPatchSchema } from "~/lib/zod/schemas/violations.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { outcomeForLevel, violationLevel, VIOLATIONS_FORBIDDEN } from "~/server/utils/violation-helpers"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

const VIOLATION_NOT_FOUND = { en: "Violation not found", vi: "Không tìm thấy vi phạm" }

export default defineEventHandler(async (event): Promise<ApiResponse<UserViolationWithUser>> => {
  try {
    const auth = requireAdmin(event, VIOLATIONS_FORBIDDEN)
    if (!auth.ok) return auth.error

    const id = Number(getRouterParam(event, "id"))
    if (Number.isNaN(id)) return fail(event, 400, MSG.invalidInput)

    const validated = await readZodBody(event, ViolationPatchSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { note, expireYear } = validated.data

    const patch: Partial<typeof userViolations.$inferInsert> = {}
    if (note !== undefined) patch.note = note
    if (expireYear !== undefined) patch.expireYear = expireYear
    if (Object.keys(patch).length === 0) return fail(event, 400, MSG.invalidInput)

    const updated = await db
      .update(userViolations)
      .set(patch)
      .where(eq(userViolations.id, id))
      .returning()
      .then((rows) => rows[0])

    if (!updated) return fail(event, 404, VIOLATION_NOT_FOUND)

    const athlete = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.vpfId, updated.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    const level = await violationLevel(updated.vpfId, new Date().getFullYear())

    logger.info("Violation updated", { violationId: id, updatedBy: auth.user.vpfId, fields: Object.keys(patch) })

    return ok(
      {
        ...updated,
        userName: athlete?.fullName ?? updated.vpfId,
        userEmail: athlete?.email ?? null,
        level,
        outcome: outcomeForLevel(level),
      },
      { en: "Violation updated", vi: "Đã cập nhật vi phạm" },
    )
  } catch (error) {
    logger.error("Error updating violation", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

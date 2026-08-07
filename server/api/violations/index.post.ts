import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { userViolations, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ViolationCreateSchema } from "~/lib/zod/schemas/violations.schema"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { outcomeForLevel, violationLevel, VIOLATIONS_FORBIDDEN } from "~/server/utils/violation-helpers"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

export default defineEventHandler(async (event): Promise<ApiResponse<UserViolationWithUser>> => {
  try {
    const auth = requireAdmin(event, VIOLATIONS_FORBIDDEN)
    if (!auth.ok) return auth.error

    const validated = await readZodBody(event, ViolationCreateSchema)
    if (!validated.success) return fail(event, 400, MSG.invalidInput)
    const { vpfId, note, expireYear } = validated.data

    const athlete = await db
      .select({ vpfId: users.vpfId, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.vpfId, vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!athlete) return fail(event, 404, MSG.athleteNotFound)

    const created = await db
      .insert(userViolations)
      .values({ vpfId, note, expireYear })
      .returning()
      .then((rows) => rows[0])

    const referenceYear = new Date().getFullYear()
    const level = await violationLevel(vpfId, referenceYear)

    logger.warn("Violation recorded", {
      violationId: created.id,
      vpfId,
      expireYear,
      level,
      recordedBy: auth.user.vpfId,
    })

    return ok(
      { ...created, userName: athlete.fullName, userEmail: athlete.email ?? null, level, outcome: outcomeForLevel(level) },
      { en: "Violation recorded", vi: "Đã ghi nhận vi phạm" },
    )
  } catch (error) {
    logger.error("Error recording violation", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

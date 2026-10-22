import { findAthleteNameAndEmail, insertViolation } from "~/server/repository/violations"
import { logger } from "~/lib/logger/logger"
import { ViolationCreateSchema } from "~/lib/zod/schemas/violations.schema"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { outcomeForLevel, violationLevel, VIOLATIONS_FORBIDDEN } from "~/server/service/violations"
import { readZodBody } from "~/server/utils/validate"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

export default defineApiHandler(async (event): Promise<ApiResponse<UserViolationWithUser>> => {
  const auth = requireAdmin(event, VIOLATIONS_FORBIDDEN)
  if (!auth.ok) return auth.error

  const validated = await readZodBody(event, ViolationCreateSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const { vpfId, note, expireYear } = validated.data

  const athlete = await findAthleteNameAndEmail(vpfId)
  if (!athlete) return fail(event, 404, MSG.athleteNotFound)

  const created = await insertViolation({ vpfId, note, expireYear })

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
})

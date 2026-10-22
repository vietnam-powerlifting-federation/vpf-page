import { z } from "zod"
import { listViolations } from "~/server/repository/violations"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { isInForce, outcomeForLevel, VIOLATIONS_FORBIDDEN } from "~/server/service/violations"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

const ViolationQuerySchema = z.object({
  vpfId: z.string().trim().optional(),
  /** Levels are relative to a year; defaults to the current one. */
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  inForceOnly: z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean()).optional(),
})

export default defineApiHandler(async (event): Promise<ApiResponse<UserViolationWithUser[]>> => {
  const auth = requireAdmin(event, VIOLATIONS_FORBIDDEN)
  if (!auth.ok) return auth.error

  const parsed = ViolationQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) return fail(event, 400, MSG.invalidInput)
  const { vpfId, inForceOnly } = parsed.data
  const referenceYear = parsed.data.year ?? new Date().getFullYear()

  const rows = await listViolations(vpfId)

  // Level is the count of an athlete's rows still in force, so it has to be
  // derived across the whole set rather than per row.
  const levelByAthlete = new Map<string, number>()
  for (const row of rows) {
    if (!isInForce(row.expireYear, referenceYear)) continue
    levelByAthlete.set(row.vpfId, (levelByAthlete.get(row.vpfId) ?? 0) + 1)
  }

  const data: UserViolationWithUser[] = rows
    .filter((row) => !inForceOnly || isInForce(row.expireYear, referenceYear))
    .map((row) => {
      const level = levelByAthlete.get(row.vpfId) ?? 0
      return { ...row, userEmail: row.userEmail ?? null, level, outcome: outcomeForLevel(level) }
    })

  return ok(data, { en: "Violations retrieved", vi: "Lấy danh sách vi phạm thành công" })
})

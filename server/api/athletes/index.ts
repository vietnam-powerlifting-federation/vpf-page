import { z } from "zod"
import { countAthletes, listAthletes, type AthleteListFilters } from "~/server/repository/athletes"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { AthleteListPage } from "~/types/users"

const boolean = z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())

/**
 * Admin-only query surface (§4.2). The public list stays exactly what it was:
 * active members only, public columns.
 */
const AthleteQuerySchema = z.object({
  /**
   * Lapsed members are invisible to admins otherwise — and they are the exact
   * population staff need for renewals, and for finding the account of someone
   * whose membership just expired.
   */
  includeInactive: boolean.optional(),
  /** Matches VPF id, full name, email or national id. */
  search: z.string().trim().min(1).max(120).optional(),
  membership: z.enum(["active", "expired"]).optional(),
  identityVerified: boolean.optional(),
  emailVerified: boolean.optional(),
  drugViolate: boolean.optional(),
  role: z.enum(["user", "admin"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export default defineApiHandler(async (event): Promise<ApiResponse<AthleteListPage>> => {
  const isAdmin = event.context.user?.role === "admin"

  const parsed = AthleteQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) return fail(event, 400, MSG.invalidInput)
  const { page, pageSize, ...filters } = parsed.data

  // The repository ignores every filter for a non-admin caller, so asking for
  // lapsed members or private columns from the public list changes nothing.
  const listFilters: AthleteListFilters = filters

  const [total, items] = await Promise.all([
    countAthletes(listFilters, isAdmin),
    listAthletes(listFilters, isAdmin, { limit: pageSize, offset: (page - 1) * pageSize }),
  ])

  return ok(
    { items, total, page, pageSize },
    {
      en: "Athletes retrieved successfully",
      vi: "Lấy danh sách vận động viên thành công",
    },
  )
})

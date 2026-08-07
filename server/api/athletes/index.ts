import { and, asc, count, eq, gte, ilike, isNull, lt, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { AthleteListPage } from "~/types/users"

const vpfMembershipActive = or(
  isNull(users.vpfMembershipExpiresAt),
  gte(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
)

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

export default defineEventHandler(async (event): Promise<ApiResponse<AthleteListPage>> => {
  try {
    const isAdmin = event.context.user?.role === "admin"

    const parsed = AthleteQuerySchema.safeParse(getQuery(event))
    if (!parsed.success) return fail(event, 400, MSG.invalidInput)
    const query = parsed.data

    // Non-admins get the old behaviour regardless of what they ask for.
    const filters = isAdmin
      ? [
        query.includeInactive ? undefined : vpfMembershipActive,
        query.membership === "active" ? vpfMembershipActive : undefined,
        query.membership === "expired"
          ? and(
            sql`${users.vpfMembershipExpiresAt} IS NOT NULL`,
            lt(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
          )
          : undefined,
        query.search
          ? or(
            ilike(users.vpfId, `%${query.search}%`),
            ilike(users.fullName, `%${query.search}%`),
            ilike(users.email, `%${query.search}%`),
            ilike(users.nationalId, `%${query.search}%`),
          )
          : undefined,
        query.identityVerified === undefined ? undefined : eq(users.identityVerified, query.identityVerified),
        query.emailVerified === undefined ? undefined : eq(users.emailVerified, query.emailVerified),
        query.drugViolate === undefined ? undefined : eq(users.drugViolate, query.drugViolate),
        query.role ? eq(users.role, query.role) : undefined,
      ]
      : [vpfMembershipActive]

    const where = and(...filters)
    const offset = (query.page - 1) * query.pageSize

    const total = await db
      .select({ value: count() })
      .from(users)
      .where(where)
      .then((rows) => rows[0]?.value ?? 0)

    const items = await db
      .select(isAdmin ? userPrivateSelect : userPublicSelect)
      .from(users)
      .where(where)
      .orderBy(asc(users.fullName), asc(users.vpfId))
      .limit(query.pageSize)
      .offset(offset)

    return ok(
      { items, total, page: query.page, pageSize: query.pageSize },
      {
        en: "Athletes retrieved successfully",
        vi: "Lấy danh sách vận động viên thành công",
      },
    )
  } catch (error) {
    logger.error("Error fetching athletes", { error })
    return fail(event, 500, MSG.internalError)
  }
})

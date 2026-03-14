import { or, isNull, gte, sql, and, inArray, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"

// VPF membership is active when expires-at is null (no expiry) or in the future
const vpfMembershipActive = or(
  isNull(users.vpfMembershipExpiresAt),
  gte(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
)

// VIP membership is active when expire date is null or on or after current date
const vipMembershipActive = or(
  isNull(users.vipMembershipExpiresAt),
  gte(users.vipMembershipExpiresAt, sql`CURRENT_DATE`),
)

type AthleteWithDecorators = (UserPrivate | UserPublic) & { decorator1?: string | null; decorator2?: string | null }

export default defineEventHandler(async (event): Promise<ApiResponse<AthleteWithDecorators[]>> => {
  try {
    const currentUser = event.context.user
    const isAdmin = currentUser?.role === "admin"
    const query = getQuery(event)
    const includeNameDecorators = query.includeNameDecorators === "true" || query.includeNameDecorators === true

    // Query all users with appropriate columns based on scope:
    // - Admin: UserPrivate (can see full data of all users, exclude password)
    // - Otherwise: UserPublic (restricted data, exclude sensitive fields)
    let allUsers: (UserPrivate | UserPublic)[]
    if (isAdmin) {
      allUsers = await db
        .select(userPrivateSelect)
        .from(users)
        .where(vpfMembershipActive)
    } else {
      allUsers = await db
        .select(userPublicSelect)
        .from(users)
        .where(vpfMembershipActive)
    }

    if (includeNameDecorators && allUsers.length > 0) {
      const vpfIds = allUsers.map((u) => u.vpfId)
      const decoratorsByVpfId = await db
        .select({
          vpfId: vipBenefits.vpfId,
          decorator1: vipBenefits.decorator1,
          decorator2: vipBenefits.decorator2,
        })
        .from(vipBenefits)
        .innerJoin(users, eq(vipBenefits.vpfId, users.vpfId))
        .where(and(vipMembershipActive, inArray(vipBenefits.vpfId, vpfIds)))
      const decoratorMap = new Map(decoratorsByVpfId.map((d) => [d.vpfId, { decorator1: d.decorator1, decorator2: d.decorator2 }]))
      const withDecorators: AthleteWithDecorators[] = allUsers.map((u) => {
        const dec = decoratorMap.get(u.vpfId)
        if (!dec) return { ...u } as AthleteWithDecorators
        return { ...u, decorator1: dec.decorator1, decorator2: dec.decorator2 } as AthleteWithDecorators
      })
      return {
        success: true,
        data: withDecorators,
        message: {
          en: "Athletes retrieved successfully",
          vi: "Lấy danh sách vận động viên thành công",
        },
      }
    }

    return {
      success: true,
      data: allUsers as AthleteWithDecorators[],
      message: {
        en: "Athletes retrieved successfully",
        vi: "Lấy danh sách vận động viên thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching athletes", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

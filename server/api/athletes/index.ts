import { or, isNull, gte, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"

const vpfMembershipActive = or(
  isNull(users.vpfMembershipExpiresAt),
  gte(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
)

export default defineEventHandler(async (event): Promise<ApiResponse<(UserPrivate | UserPublic)[]>> => {
  try {
    const currentUser = event.context.user
    const isAdmin = currentUser?.role === "admin"

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

    return {
      success: true,
      data: allUsers,
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

import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"

export default defineEventHandler(async (event): Promise<ApiResponse<(UserPrivate[] | UserPublic[])>> => {
  try {
    const currentUser = event.context.user
    const isAdmin = currentUser?.role === "admin"

    // Query all users with appropriate columns based on scope:
    // - Admin: UserPrivate (can see full data of all users, exclude password)
    // - Otherwise: UserPublic (restricted data, exclude sensitive fields)
    let allUsers
    if (isAdmin) {
      allUsers = await db
        .select(userPrivateSelect)
        .from(users)
        .where(eq(users.active, true))
    } else {
      allUsers = await db
        .select(userPublicSelect)
        .from(users)
        .where(eq(users.active, true))
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

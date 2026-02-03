import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"

export default defineEventHandler(async (event): Promise<ApiResponse<UserPrivate>> => {
  try {
    const currentUser = event.context.user

    if (!currentUser || !currentUser.vpfId) {
      setResponseStatus(event, 401)
      return {
        success: false,
        data: null,
        message: {
          en: "Unauthorized",
          vi: "Không được phép",
        },
      }
    }

    // Query the current user's profile
    const result = await db
      .select(userPrivateSelect)
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)

    const user = result[0]

    if (!user) {
      setResponseStatus(event, 404)
      return {
        success: false,
        data: null,
        message: {
          en: "User not found",
          vi: "Không tìm thấy người dùng",
        },
      }
    }

    return {
      success: true,
      data: user,
      message: {
        en: "Profile retrieved successfully",
        vi: "Lấy thông tin hồ sơ thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching user profile", { error })
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

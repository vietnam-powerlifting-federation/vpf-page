import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import { UserSelfPatchSchema, UserRequiredSchema } from "~/lib/zod/schemas/users.schema"
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

    const body = await readBody(event)

    // Validate the patch data
    const patchResult = UserSelfPatchSchema.safeParse(body)
    if (!patchResult.success) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid input data",
          vi: "Dữ liệu đầu vào không hợp lệ",
        },
      }
    }

    // Get current user data to check required fields
    const currentUserData = await db
      .select(userPrivateSelect)
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!currentUserData) {
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

    // Merge current data with patch data
    const mergedData = {
      ...currentUserData,
      ...patchResult.data,
    }

    // Validate required fields after merge
    const requiredResult = UserRequiredSchema.safeParse(mergedData)
    if (!requiredResult.success) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Required fields are missing or invalid",
          vi: "Các trường bắt buộc bị thiếu hoặc không hợp lệ",
        },
      }
    }

    // Update user in database
    await db
      .update(users)
      .set(patchResult.data)
      .where(eq(users.vpfId, currentUser.vpfId))

    // Fetch updated user
    const updatedUser = await db
      .select(userPrivateSelect)
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!updatedUser) {
      setResponseStatus(event, 404)
      return {
        success: false,
        data: null,
        message: {
          en: "User not found after update",
          vi: "Không tìm thấy người dùng sau khi cập nhật",
        },
      }
    }

    return {
      success: true,
      data: updatedUser,
      message: {
        en: "Profile updated successfully",
        vi: "Cập nhật hồ sơ thành công",
      },
    }
  } catch (error) {
    logger.error("Error updating user profile", { error })
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

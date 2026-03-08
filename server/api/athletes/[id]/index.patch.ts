import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import { UserSelfPatchSchema, UserRequiredSchema } from "~/lib/zod/schemas/users.schema"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"

export default defineEventHandler(async (event): Promise<ApiResponse<UserPrivate>> => {
  try {
    const idParam = getRouterParam(event, "id")
    const currentUser = event.context.user

    if (idParam !== "self") {
      setResponseStatus(event, 403)
      return {
        success: false,
        data: null,
        message: {
          en: "Only the current athlete profile can be updated",
          vi: "Chỉ có thể cập nhật hồ sơ vận động viên hiện tại",
        },
      }
    }

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

    // Get current athlete data to check required fields
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
          en: "Athlete not found",
          vi: "Không tìm thấy vận động viên",
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

    // Update athlete in database
    await db
      .update(users)
      .set(patchResult.data)
      .where(eq(users.vpfId, currentUser.vpfId))

    // Fetch updated athlete
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
          en: "Athlete not found after update",
          vi: "Không tìm thấy vận động viên sau khi cập nhật",
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
    logger.error("Error updating athlete profile", { error })
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

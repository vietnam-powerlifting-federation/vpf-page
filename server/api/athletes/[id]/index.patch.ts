import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import { UserSelfPatchSchema, UserRequiredSchema } from "~/lib/zod/schemas/users.schema"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<UserPrivate>> => {
  try {
    const idParam = getRouterParam(event, "id")

    if (idParam !== "self") {
      return fail(event, 403, {
        en: "Only the current athlete profile can be updated",
        vi: "Chỉ có thể cập nhật hồ sơ vận động viên hiện tại",
      })
    }

    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    // Validate the patch data
    const validated = await readZodBody(event, UserSelfPatchSchema)
    if (!validated.success) {
      return fail(event, 400, MSG.invalidInput)
    }

    // Get current athlete data to check required fields
    const currentUserData = await db
      .select(userPrivateSelect)
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!currentUserData) {
      return fail(event, 404, MSG.athleteNotFound)
    }

    // Merge current data with patch data
    const mergedData = {
      ...currentUserData,
      ...validated.data,
    }

    // Validate required fields after merge
    const requiredResult = UserRequiredSchema.safeParse(mergedData)
    if (!requiredResult.success) {
      return fail(event, 400, {
        en: "Required fields are missing or invalid",
        vi: "Các trường bắt buộc bị thiếu hoặc không hợp lệ",
      })
    }

    // Update athlete in database
    await db
      .update(users)
      .set(validated.data)
      .where(eq(users.vpfId, currentUser.vpfId))

    // Fetch updated athlete
    const updatedUser = await db
      .select(userPrivateSelect)
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!updatedUser) {
      return fail(event, 404, {
        en: "Athlete not found after update",
        vi: "Không tìm thấy vận động viên sau khi cập nhật",
      })
    }

    return ok(updatedUser, { en: "Profile updated successfully", vi: "Cập nhật hồ sơ thành công" })
  } catch (error) {
    logger.error("Error updating athlete profile", { error })
    return fail(event, 500, MSG.internalError)
  }
})

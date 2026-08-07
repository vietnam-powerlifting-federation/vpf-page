import type { H3Event } from "h3"
import { and, eq, ne } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import { UserSelfPatchSchema, UserRequiredSchema, UserAdminPatchSchema } from "~/lib/zod/schemas/users.schema"
import type { ApiResponse } from "~/types/api"
import type { JwtPayload } from "~/lib/utils/jwt"
import type { UserPrivate } from "~/types/users"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<UserPrivate>> => {
  try {
    const idParam = getRouterParam(event, "id")
    if (!idParam) return fail(event, 400, MSG.invalidInput)

    const auth = requireUser(event)
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    return idParam === "self"
      ? await patchSelf(event, currentUser.vpfId)
      : await patchAsAdmin(event, idParam, currentUser)
  } catch (error) {
    logger.error("Error updating athlete profile", { error })
    return fail(event, 500, MSG.internalError)
  }
})

/** The athlete editing their own profile. Unchanged behaviour. */
async function patchSelf(event: H3Event, vpfId: string): Promise<ApiResponse<UserPrivate>> {
  const validated = await readZodBody(event, UserSelfPatchSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)

  const currentUserData = await db
    .select(userPrivateSelect)
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!currentUserData) return fail(event, 404, MSG.athleteNotFound)

  // Required fields are validated against the merged record, so a patch cannot
  // blank out something the profile needs.
  const requiredResult = UserRequiredSchema.safeParse({ ...currentUserData, ...validated.data })
  if (!requiredResult.success) {
    return fail(event, 400, {
      en: "Required fields are missing or invalid",
      vi: "Các trường bắt buộc bị thiếu hoặc không hợp lệ",
    })
  }

  await db.update(users).set(validated.data).where(eq(users.vpfId, vpfId))

  const updatedUser = await db
    .select(userPrivateSelect)
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!updatedUser) {
    return fail(event, 404, {
      en: "Athlete not found after update",
      vi: "Không tìm thấy vận động viên sau khi cập nhật",
    })
  }

  return ok(updatedUser, { en: "Profile updated successfully", vi: "Cập nhật hồ sơ thành công" })
}

/**
 * An admin editing someone else's account (§4.1). Before this existed, fixing a
 * name, setting a doping ban or adjusting a membership expiry all required SQL.
 */
async function patchAsAdmin(
  event: H3Event,
  targetVpfId: string,
  currentUser: JwtPayload,
): Promise<ApiResponse<UserPrivate>> {
  if (currentUser.role !== "admin") {
    return fail(event, 403, {
      en: "Only admins can edit another athlete's profile",
      vi: "Chỉ quản trị viên mới có thể sửa hồ sơ của vận động viên khác",
    })
  }

  const validated = await readZodBody(event, UserAdminPatchSchema)
  if (!validated.success) return fail(event, 400, MSG.invalidInput)
  const { drugViolateReason, ...patch } = validated.data

  const target = await db
    .select({
      vpfId: users.vpfId,
      email: users.email,
      role: users.role,
      drugViolate: users.drugViolate,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.vpfId, targetVpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!target) return fail(event, 404, MSG.athleteNotFound)

  // Locking yourself out is not recoverable through the UI.
  if (patch.role && patch.role !== "admin" && targetVpfId === currentUser.vpfId) {
    return fail(event, 400, {
      en: "You cannot remove your own admin role",
      vi: "Bạn không thể tự gỡ quyền quản trị của mình",
    })
  }

  const togglingDoping = patch.drugViolate !== undefined
    && (patch.drugViolate ?? false) !== (target.drugViolate ?? false)
  if (togglingDoping && !drugViolateReason) {
    return fail(event, 400, {
      en: "A reason is required when setting or clearing a doping ban",
      vi: "Cần nêu lý do khi đặt hoặc gỡ lệnh cấm doping",
    })
  }

  if (patch.email !== undefined && patch.email !== target.email) {
    const taken = await db
      .select({ vpfId: users.vpfId })
      .from(users)
      .where(and(eq(users.email, patch.email!), ne(users.vpfId, targetVpfId)))
      .limit(1)
      .then((rows) => rows[0])
    if (taken) return fail(event, 409, MSG.emailAlreadyExists)
  }

  if (patch.slug !== undefined && patch.slug !== null) {
    const taken = await db
      .select({ vpfId: users.vpfId })
      .from(users)
      .where(and(eq(users.slug, patch.slug), ne(users.vpfId, targetVpfId)))
      .limit(1)
      .then((rows) => rows[0])
    if (taken) {
      return fail(event, 409, {
        en: "That profile URL is already used by another athlete",
        vi: "Đường dẫn hồ sơ này đã được dùng cho vận động viên khác",
      })
    }
  }

  const updates: Record<string, unknown> = { ...patch }
  // A changed address must be re-proved, or the account keeps a verified badge
  // for a mailbox nobody has confirmed.
  if (patch.email !== undefined && patch.email !== target.email) updates.emailVerified = false

  await db.update(users).set(updates).where(eq(users.vpfId, targetVpfId))

  if (togglingDoping) {
    logger.warn("Doping ban changed", {
      vpfId: targetVpfId,
      drugViolate: patch.drugViolate,
      reason: drugViolateReason,
      changedBy: currentUser.vpfId,
    })
  }
  logger.info("Athlete updated by admin", {
    vpfId: targetVpfId,
    updatedBy: currentUser.vpfId,
    fields: Object.keys(updates),
  })

  const updatedUser = await db
    .select(userPrivateSelect)
    .from(users)
    .where(eq(users.vpfId, targetVpfId))
    .limit(1)
    .then((rows) => rows[0])

  if (!updatedUser) return fail(event, 404, MSG.athleteNotFound)

  return ok(updatedUser, { en: "Athlete updated", vi: "Đã cập nhật vận động viên" })
}

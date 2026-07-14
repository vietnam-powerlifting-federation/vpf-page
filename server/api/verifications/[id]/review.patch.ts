import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "~/lib/utils/email"
import { IdentityVerificationReviewSchema } from "~/lib/zod/schemas/identity-verification.schema"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<IdentityVerification>> => {
  try {
    const currentUser = event.context.user
    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<IdentityVerification>
    }

    if (currentUser.role !== "admin") {
      return fail(event, 403, {
        en: "Only admins can review verifications",
        vi: "Chỉ quản trị viên mới có thể duyệt hồ sơ",
      }) as ApiResponse<IdentityVerification>
    }

    const idParam = getRouterParam(event, "id")
    const id = Number(idParam)
    if (!idParam || Number.isNaN(id)) {
      return fail(event, 400, { en: "Invalid verification id", vi: "ID hồ sơ không hợp lệ" }) as ApiResponse<IdentityVerification>
    }

    const validated = await readZodBody(event, IdentityVerificationReviewSchema)
    if (!validated.success) {
      return fail(event, 400, { en: "Invalid review data", vi: "Dữ liệu duyệt không hợp lệ" }) as ApiResponse<IdentityVerification>
    }

    const { decision, reviewNote } = validated.data

    const verification = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!verification) {
      return fail(event, 404, { en: "Verification not found", vi: "Không tìm thấy hồ sơ" }) as ApiResponse<IdentityVerification>
    }

    const nowIso = new Date().toISOString()

    const updated = await db
      .update(identityVerifications)
      .set({
        status: decision,
        reviewedBy: currentUser.vpfId,
        reviewedAt: nowIso,
        reviewNote: reviewNote ?? null,
        updatedAt: nowIso,
      })
      .where(eq(identityVerifications.id, id))
      .returning()
      .then((rows) => rows[0])

    if (!updated) {
      return fail(event, 500, { en: "Failed to update verification", vi: "Cập nhật hồ sơ thất bại" }) as ApiResponse<IdentityVerification>
    }

    // On approval, copy the verified information onto the athlete's official record.
    if (decision === "approved") {
      await db
        .update(users)
        .set({
          fullName: verification.fullName,
          nationality: verification.nationality,
          dob: verification.dob,
          nationalId: verification.nationalId,
          address: verification.address,
          phoneNumber: verification.phoneNumber,
        })
        .where(eq(users.vpfId, verification.vpfId))
    }

    // Notify the athlete of the decision.
    const recipient = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.vpfId, verification.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (recipient?.email) {
      if (decision === "approved") {
        await sendVerificationApprovedEmail(recipient.email)
      } else {
        await sendVerificationRejectedEmail(recipient.email, reviewNote)
      }
    }

    logger.info("Identity verification reviewed", { id, decision, reviewedBy: currentUser.vpfId })

    return ok(updated, {
      en: decision === "approved" ? "Verification approved" : "Verification rejected",
      vi: decision === "approved" ? "Đã duyệt hồ sơ" : "Đã từ chối hồ sơ",
    })
  } catch (error) {
    logger.error("Error reviewing verification", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<IdentityVerification>
  }
})

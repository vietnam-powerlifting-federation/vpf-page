import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "~/lib/utils/email"
import { deleteVipImage } from "~/lib/utils/r2-vip-upload"
import { IdentityVerificationReviewSchema } from "~/lib/zod/schemas/identity-verification.schema"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"
import { invalidatePublicData } from "~/server/service/cache"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { readZodBody } from "~/server/utils/validate"

export default defineEventHandler(async (event): Promise<ApiResponse<IdentityVerification>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can review verifications",
      vi: "Chỉ quản trị viên mới có thể duyệt hồ sơ",
    })
    if (!auth.ok) return auth.error
    const currentUser = auth.user

    const idParam = getRouterParam(event, "id")
    const id = Number(idParam)
    if (!idParam || Number.isNaN(id)) {
      return fail(event, 400, { en: "Invalid verification id", vi: "ID hồ sơ không hợp lệ" })
    }

    const validated = await readZodBody(event, IdentityVerificationReviewSchema)
    if (!validated.success) {
      return fail(event, 400, { en: "Invalid review data", vi: "Dữ liệu duyệt không hợp lệ" })
    }

    const { decision, reviewNote } = validated.data

    const verification = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!verification) {
      return fail(event, 404, { en: "Verification not found", vi: "Không tìm thấy hồ sơ" })
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
        // Approval extracts everything we need onto the athlete's record, so the ID card image
        // itself is no longer needed. Rejection keeps it until the athlete resubmits.
        ...(decision === "approved" ? { idCardFrontUrl: null } : {}),
      })
      .where(eq(identityVerifications.id, id))
      .returning()
      .then((rows) => rows[0])

    if (!updated) {
      return fail(event, 500, { en: "Failed to update verification", vi: "Cập nhật hồ sơ thất bại" })
    }

    // Only once the row no longer references it, so a failed update never destroys an image
    // the admin still needs to review. A failure here leaves an orphan at a random key that is
    // no longer stored anywhere; the log carries the URL so it can be cleaned up by hand.
    if (decision === "approved" && verification.idCardFrontUrl) {
      try {
        await deleteVipImage(verification.idCardFrontUrl)
      } catch (error) {
        logger.error("Failed to delete ID card image after approval", {
          id,
          vpfId: verification.vpfId,
          url: verification.idCardFrontUrl,
          error: (error as Error).message,
        })
      }
    }

    // On approval, copy the verified information onto the athlete's official record and
    // flip the denormalized identityVerified flag. Rejection clears the flag so it always
    // mirrors whether the athlete's current verification is approved.
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
          identityVerified: true,
        })
        .where(eq(users.vpfId, verification.vpfId))
    } else {
      await db
        .update(users)
        .set({ identityVerified: false })
        .where(eq(users.vpfId, verification.vpfId))
    }

    // Approval overwrites the athlete's name, nationality and date of birth from
    // the verified ID — all three are on the public record, and the date of birth
    // decides which age divisions their lifts set records in.
    if (decision === "approved") {
      await invalidatePublicData("identity-verification-approved")
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
    return fail(event, 500, MSG.internalError)
  }
})

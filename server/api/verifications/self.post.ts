import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { identityVerifications, users } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { uploadVipImage } from "~/lib/utils/r2-vip-upload"
import { IdentityVerificationSubmitSchema } from "~/lib/zod/schemas/identity-verification.schema"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { ok, fail } from "~/server/utils/api-response"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ID_CARD_FIELD = "idCardFront"

export default defineEventHandler(async (event): Promise<ApiResponse<IdentityVerification>> => {
  try {
    const currentUser = event.context.user
    if (!currentUser?.vpfId) {
      return fail(event, 401, { en: "Unauthorized", vi: "Không được phép" }) as ApiResponse<IdentityVerification>
    }

    // Email must be verified before an athlete can submit identity verification.
    const account = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!account) {
      return fail(event, 404, { en: "User not found", vi: "Không tìm thấy người dùng" }) as ApiResponse<IdentityVerification>
    }

    if (!account.emailVerified) {
      return fail(event, 403, {
        en: "Please verify your email before submitting verification",
        vi: "Vui lòng xác minh email trước khi gửi hồ sơ xác minh",
      }) as ApiResponse<IdentityVerification>
    }

    const existing = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.vpfId, currentUser.vpfId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    // Once approved, the form is locked.
    if (existing?.status === "approved") {
      return fail(event, 403, {
        en: "Your verification is already approved and cannot be changed",
        vi: "Hồ sơ của bạn đã được duyệt và không thể thay đổi",
      }) as ApiResponse<IdentityVerification>
    }

    const contentType = getRequestHeader(event, "content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return fail(event, 400, {
        en: "Expected multipart form data",
        vi: "Yêu cầu dữ liệu multipart",
      }) as ApiResponse<IdentityVerification>
    }

    const form = await readMultipartFormData(event)
    if (!form?.length) {
      return fail(event, 400, { en: "Invalid or empty form data", vi: "Dữ liệu form không hợp lệ hoặc trống" }) as ApiResponse<IdentityVerification>
    }

    const textFields: Record<string, string> = {}
    let idCardFile: { data: Buffer; filename: string; type?: string } | null = null

    for (const part of form) {
      if (!part.name) continue
      if (part.name === ID_CARD_FIELD && part.filename && part.data) {
        const type = part.type || ""
        if (!ALLOWED_IMAGE_TYPES.includes(type)) {
          return fail(event, 400, {
            en: "Invalid image type. Allowed: JPEG, PNG, WebP",
            vi: "Loại ảnh không hợp lệ. Cho phép: JPEG, PNG, WebP",
          }) as ApiResponse<IdentityVerification>
        }
        idCardFile = { data: part.data, filename: part.filename, type: part.type }
      } else if (typeof part.data !== "undefined") {
        textFields[part.name] = part.data.toString()
      }
    }

    const parsed = IdentityVerificationSubmitSchema.safeParse(textFields)
    if (!parsed.success) {
      return fail(event, 400, {
        en: "Invalid verification information",
        vi: "Thông tin xác minh không hợp lệ",
      }) as ApiResponse<IdentityVerification>
    }

    // A photo is required on first submission; on resubmission the existing one is kept if none is provided.
    let idCardFrontUrl = existing?.idCardFrontUrl ?? null
    if (idCardFile) {
      idCardFrontUrl = await uploadVipImage(currentUser.vpfId, "id-card-front", new Uint8Array(idCardFile.data), {
        filename: idCardFile.filename,
        mimeType: idCardFile.type,
      })
    }

    if (!idCardFrontUrl) {
      return fail(event, 400, {
        en: "A photo of your national ID card (front) is required",
        vi: "Cần ảnh mặt trước căn cước công dân",
      }) as ApiResponse<IdentityVerification>
    }

    const nowIso = new Date().toISOString()
    const values = {
      vpfId: currentUser.vpfId,
      ...parsed.data,
      idCardFrontUrl,
      // Any (re)submission resets the review state to pending.
      status: "pending" as const,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      updatedAt: nowIso,
    }

    const saved = await db
      .insert(identityVerifications)
      .values(values)
      .onConflictDoUpdate({
        target: identityVerifications.vpfId,
        set: {
          fullName: values.fullName,
          nationality: values.nationality,
          dob: values.dob,
          nationalId: values.nationalId,
          address: values.address,
          phoneNumber: values.phoneNumber,
          idCardFrontUrl: values.idCardFrontUrl,
          status: values.status,
          reviewedBy: values.reviewedBy,
          reviewedAt: values.reviewedAt,
          reviewNote: values.reviewNote,
          updatedAt: values.updatedAt,
        },
      })
      .returning()
      .then((rows) => rows[0])

    if (!saved) {
      return fail(event, 500, { en: "Failed to save verification", vi: "Lưu hồ sơ thất bại" }) as ApiResponse<IdentityVerification>
    }

    logger.info("Identity verification submitted", { vpfId: currentUser.vpfId })

    return ok(saved, { en: "Verification submitted successfully", vi: "Gửi hồ sơ xác minh thành công" })
  } catch (error) {
    logger.error("Error submitting verification", { error: (error as Error).message })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<IdentityVerification>
  }
})

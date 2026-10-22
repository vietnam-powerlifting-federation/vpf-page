import { logger } from "~/lib/logger/logger"
import {
  findEmailVerified,
  findVerificationSubmission,
  upsertVerificationSubmission,
} from "~/server/repository/verifications"
import { deleteVipImage, uploadVipImage } from "~/lib/external/r2-vip-upload"
import { IdentityVerificationSubmitSchema } from "~/lib/zod/schemas/identity-verification.schema"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ID_CARD_FIELD = "idCardFront"

export default defineApiHandler(async (event): Promise<ApiResponse<IdentityVerification>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const idParam = getRouterParam(event, "id")
  if (idParam !== "me" && idParam !== currentUser.vpfId) {
    return fail(event, 403, {
      en: "You may only submit your own verification",
      vi: "Bạn chỉ có thể gửi hồ sơ xác minh của mình",
    })
  }

  // Email must be verified before an athlete can submit identity verification.
  const emailVerified = await findEmailVerified(currentUser.vpfId)
  if (emailVerified === null) {
    return fail(event, 404, MSG.userNotFound)
  }

  if (!emailVerified) {
    return fail(event, 403, {
      en: "Please verify your email before submitting verification",
      vi: "Vui lòng xác minh email trước khi gửi hồ sơ xác minh",
    })
  }

  const existing = await findVerificationSubmission(currentUser.vpfId)

  // Once approved, the form is locked.
  if (existing?.status === "approved") {
    return fail(event, 403, {
      en: "Your verification is already approved and cannot be changed",
      vi: "Hồ sơ của bạn đã được duyệt và không thể thay đổi",
    })
  }

  const contentType = getRequestHeader(event, "content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return fail(event, 400, {
      en: "Expected multipart form data",
      vi: "Yêu cầu dữ liệu multipart",
    })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    return fail(event, 400, { en: "Invalid or empty form data", vi: "Dữ liệu form không hợp lệ hoặc trống" })
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
        })
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
    })
  }

  // A photo is required on first submission; on resubmission the existing one is kept if none is provided.
  let idCardFrontUrl = existing?.idCardFrontUrl ?? null
  let supersededUrl: string | null = null
  if (idCardFile) {
    idCardFrontUrl = await uploadVipImage(currentUser.vpfId, "id-card-front", new Uint8Array(idCardFile.data), {
      filename: idCardFile.filename,
      mimeType: idCardFile.type,
      unguessable: true,
    })
    supersededUrl = existing?.idCardFrontUrl ?? null
  }

  if (!idCardFrontUrl) {
    return fail(event, 400, {
      en: "A photo of your national ID card (front) is required",
      vi: "Cần ảnh mặt trước căn cước công dân",
    })
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

  const saved = await upsertVerificationSubmission(values)

  if (!saved) {
    return fail(event, 500, { en: "Failed to save verification", vi: "Lưu hồ sơ thất bại" })
  }

  // Each upload lands on a fresh random key, so the replaced image would otherwise stay
  // readable in the bucket forever. Deleted only after the row points at the new one.
  if (supersededUrl && supersededUrl !== idCardFrontUrl) {
    try {
      await deleteVipImage(supersededUrl)
    } catch (error) {
      logger.error("Failed to delete superseded ID card image", {
        vpfId: currentUser.vpfId,
        url: supersededUrl,
        error: (error as Error).message,
      })
    }
  }

  logger.info("Identity verification submitted", { vpfId: currentUser.vpfId })

  return ok(saved, { en: "Verification submitted successfully", vi: "Gửi hồ sơ xác minh thành công" })
})

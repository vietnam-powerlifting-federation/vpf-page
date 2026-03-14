import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import { config } from "~/lib/config/config"
import { logger } from "~/lib/logger/logger"
import { uploadVipImage } from "~/lib/utils/r2-vip-upload"
import { VipSettingsPatchSchema } from "~/lib/zod/schemas/vip.schema"
import type { ApiResponse } from "~/types/api"
import type { VipBenefits } from "~/types/vip"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const FILE_FIELDS = ["avatar", "banner1", "banner2", "banner3", "banner4", "banner5"] as const
const BANNER_URL_KEYS = ["bannerImageUrl1", "bannerImageUrl2", "bannerImageUrl3", "bannerImageUrl4", "bannerImageUrl5"] as const

export default defineEventHandler(async (event): Promise<ApiResponse<VipBenefits>> => {
  try {
    const idParam = getRouterParam(event, "id")
    const currentUser = event.context.user

    if (!currentUser?.vpfId) {
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

    const vpfId = idParam === "self" ? currentUser.vpfId : idParam
    if (!vpfId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Athlete ID is required",
          vi: "ID vận động viên là bắt buộc",
        },
      }
    }

    const isAdmin = currentUser.role === "admin"
    const isSelf = idParam === "self" || currentUser.vpfId === vpfId
    if (!isSelf && !isAdmin) {
      setResponseStatus(event, 403)
      return {
        success: false,
        data: null,
        message: {
          en: "You may only update your own VIP settings, or an admin may update any athlete's",
          vi: "Bạn chỉ có thể cập nhật cài đặt VIP của mình, hoặc admin có thể cập nhật của bất kỳ vận động viên nào",
        },
      }
    }

    const contentType = getRequestHeader(event, "content-type") || ""
    let patch: Partial<Omit<VipBenefits, "vpfId">> = {}

    if (contentType.includes("multipart/form-data")) {
      if (!config.r2.isConfigured) {
        setResponseStatus(event, 503)
        return {
          success: false,
          data: null,
          message: {
            en: "Image upload is not configured",
            vi: "Tải ảnh lên chưa được cấu hình",
          },
        }
      }
      const form = await readMultipartFormData(event)
      if (!form?.length) {
        setResponseStatus(event, 400)
        return {
          success: false,
          data: null,
          message: {
            en: "Invalid or empty form data",
            vi: "Dữ liệu form không hợp lệ hoặc trống",
          },
        }
      }
      const textFields: Record<string, string> = {}
      const files: { field: string; data: Buffer; filename: string; type?: string }[] = []
      for (const part of form) {
        if (!part.name) continue
        if (part.filename && part.data) {
          if (FILE_FIELDS.includes(part.name as (typeof FILE_FIELDS)[number])) {
            const type = part.type || ""
            if (!ALLOWED_IMAGE_TYPES.includes(type)) {
              setResponseStatus(event, 400)
              return {
                success: false,
                data: null,
                message: {
                  en: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP",
                  vi: "Loại ảnh không hợp lệ. Cho phép: JPEG, PNG, GIF, WebP",
                },
              }
            }
            files.push({
              field: part.name,
              data: part.data,
              filename: part.filename,
              type: part.type,
            })
          }
        } else if (typeof part.data === "string") {
          textFields[part.name] = part.data
        }
      }
      const booleanKeys = [
        "displayProfileDescription", "displayAlias", "displayFacebook", "displayInstagram",
        "displayTiktok", "displayYoutube", "displayMobilePhone",
      ]
      const imageUrlKeys = [
        "avatarImageUrl", "bannerImageUrl1", "bannerImageUrl2", "bannerImageUrl3", "bannerImageUrl4", "bannerImageUrl5",
      ]
      const coerced: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(textFields)) {
        if (booleanKeys.includes(k) && (v === "true" || v === "false")) {
          coerced[k] = v === "true"
        } else if (imageUrlKeys.includes(k) && (v === "" || v === "null")) {
          coerced[k] = null
        } else {
          coerced[k] = v
        }
      }
      const parsed = VipSettingsPatchSchema.safeParse(coerced)
      if (parsed.success) patch = { ...patch, ...parsed.data }

      for (const f of files) {
        const fieldLower = f.field.toLowerCase()
        const url = await uploadVipImage(vpfId, f.field, new Uint8Array(f.data), {
          filename: f.filename,
          mimeType: f.type,
        })
        if (url) {
          if (fieldLower === "avatar") patch.avatarImageUrl = url
          else if (fieldLower.startsWith("banner")) {
            const idx = parseInt(fieldLower.replace("banner", ""), 10)
            if (Number.isNaN(idx) || idx < 1 || idx > 5) continue
            patch[BANNER_URL_KEYS[idx - 1]] = url
          }
        } else {
          logger.warn("VIP image uploaded to R2 but URL not returned (check CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE)", {
            vpfId,
            field: f.field,
          })
        }
      }
    } else {
      const body = await readBody(event)
      const parsed = VipSettingsPatchSchema.safeParse(body)
      if (!parsed.success) {
        setResponseStatus(event, 400)
        return {
          success: false,
          data: null,
          message: {
            en: "Invalid VIP settings data",
            vi: "Dữ liệu cài đặt VIP không hợp lệ",
          },
        }
      }
      patch = parsed.data
    }

    if (Object.keys(patch).length === 0) {
      const existing = await db
        .select()
        .from(vipBenefits)
        .where(eq(vipBenefits.vpfId, vpfId))
        .limit(1)
        .then((rows) => rows[0])
      if (existing) {
        return {
          success: true,
          data: existing,
          message: {
            en: "VIP settings unchanged",
            vi: "Cài đặt VIP không thay đổi",
          },
        }
      }
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "No VIP settings data provided",
          vi: "Chưa cung cấp dữ liệu cài đặt VIP",
        },
      }
    }

    const existing = await db
      .select()
      .from(vipBenefits)
      .where(eq(vipBenefits.vpfId, vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (existing) {
      await db
        .update(vipBenefits)
        .set({ ...patch, vpfId })
        .where(eq(vipBenefits.vpfId, vpfId))
    } else {
      await db
        .insert(vipBenefits)
        .values({ vpfId, ...patch })
    }

    const updated = await db
      .select()
      .from(vipBenefits)
      .where(eq(vipBenefits.vpfId, vpfId))
      .limit(1)
      .then((rows) => rows[0])

    if (!updated) {
      setResponseStatus(event, 500)
      return {
        success: false,
        data: null,
        message: {
          en: "Failed to save VIP settings",
          vi: "Lưu cài đặt VIP thất bại",
        },
      }
    }

    return {
      success: true,
      data: updated,
      message: {
        en: "VIP settings updated successfully",
        vi: "Cập nhật cài đặt VIP thành công",
      },
    }
  } catch (error) {
    logger.error("Error updating VIP settings", { error })
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

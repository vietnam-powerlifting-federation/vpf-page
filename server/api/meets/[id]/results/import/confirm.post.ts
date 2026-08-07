import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { invalidatePublicData } from "~/server/service/cache"
import { resolveMeet } from "~/server/utils/competition-registration"
import { applyImport, buildImportContext } from "~/server/utils/liftingcast-import"
import { readImportUpload } from "~/server/utils/liftingcast-upload"
import type { ApiResponse } from "~/types/api"
import type { ImportResult } from "~/types/attempts"

/**
 * Step 3 of the results import (§3.5): one transaction that replaces the meet's
 * public record.
 *
 * The file is re-uploaded and **re-parsed** here rather than trusting a preview
 * held in a session: the checksum from step 2 must match the fresh parse, so what
 * is committed is provably what was previewed. The blocking-error check is
 * repeated too — the preview's disabled button is a courtesy, this is the gate.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<ImportResult>> => {
  try {
    const auth = requireAdmin(event, {
      en: "Only admins can import results",
      vi: "Chỉ quản trị viên mới có thể nhập kết quả",
    })
    if (!auth.ok) return auth.error

    const identifier = getRouterParam(event, "id")
    if (!identifier) return fail(event, 400, MSG.invalidInput)

    const meet = await resolveMeet(identifier)
    if (!meet) return fail(event, 404, { en: "Meet not found", vi: "Không tìm thấy meet" })

    const upload = await readImportUpload(event)
    if (!upload.ok) return fail(event, upload.statusCode, upload.message)

    const checksum = upload.upload.fields.checksum
    if (!checksum) {
      return fail(event, 400, {
        en: "The preview checksum is required",
        vi: "Cần có mã kiểm tra từ bước xem trước",
      })
    }

    const context = await buildImportContext(meet, upload.upload.csv, upload.upload.overrides)

    if (context.preview.checksum !== checksum) {
      return fail(event, 409, {
        en: "This file no longer matches the one you previewed. Preview it again before importing.",
        vi: "Tệp này không còn khớp với tệp bạn đã xem trước. Hãy xem trước lại trước khi nhập.",
      })
    }

    if (context.preview.blocked) {
      return fail(event, 400, {
        en: "The file still has blocking errors; fix them in LiftingCast and re-export, or resolve them in the preview",
        vi: "Tệp vẫn còn lỗi chặn; hãy sửa trong LiftingCast rồi xuất lại, hoặc xử lý ở bước xem trước",
      })
    }

    const result = await applyImport(meet, context)

    // The cache outlives the import, so without this the admin imports, sees a
    // records page and a meet page that have not changed, and imports again (§3.6).
    await invalidatePublicData("results-import")

    logger.info("Meet results imported", { importedBy: auth.user.vpfId, ...result })

    return ok(result, {
      en: `Imported: ${result.created} created, ${result.updated} updated, ${result.deleted} removed`,
      vi: `Đã nhập: ${result.created} thêm mới, ${result.updated} cập nhật, ${result.deleted} xoá`,
    })
  } catch (error) {
    logger.error("Error confirming results import", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

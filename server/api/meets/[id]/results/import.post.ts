import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireAdmin } from "~/server/utils/auth-guard"
import { resolveMeet } from "~/server/utils/competition-registration"
import { buildImportContext } from "~/server/utils/liftingcast-import"
import { readImportUpload } from "~/server/utils/liftingcast-upload"
import type { ApiResponse } from "~/types/api"
import type { ImportPreview } from "~/types/attempts"

/**
 * Step 2 of the results import (§3.5): parse, match, map and derive — and **write
 * nothing**. The response is the whole diff, per row, plus a checksum the confirm
 * step uses to prove it is committing the file that was previewed.
 *
 * The preview is not a convenience. A LiftingCast row with 74.5 kg against the 74
 * class disqualifies that athlete silently — the row imports fine and they drop
 * off the rankings — so the derived block this returns is the only place that
 * mistake is visible before it becomes the public record.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<ImportPreview>> => {
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

    const context = await buildImportContext(meet, upload.upload.csv, upload.upload.overrides)

    return ok(context.preview, {
      en: "Import preview ready — nothing has been written yet",
      vi: "Đã sẵn sàng xem trước — chưa có gì được ghi",
    })
  } catch (error) {
    logger.error("Error previewing results import", { error: (error as Error).message })
    return fail(event, 500, MSG.internalError)
  }
})

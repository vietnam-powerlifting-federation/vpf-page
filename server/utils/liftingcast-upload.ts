import type { H3Event } from "h3"
import { ImportOverridesSchema } from "~/lib/zod/schemas/results-import.schema"
import type { I18nMessage } from "~/server/utils/api-response"
import type { ImportOverrides } from "~/server/utils/liftingcast-import"

/**
 * The H3 side of the results import: pull the CSV and the admin's per-row
 * decisions out of a multipart body.
 *
 * Kept out of `liftingcast-import.ts` on purpose — that module has no H3
 * dependency so it stays unit-testable against fixture CSVs — and shared by the
 * preview and confirm endpoints so both read the upload identically.
 */
export type ImportUpload = {
  csv: string
  overrides: ImportOverrides
  fields: Record<string, string>
}

export type ImportUploadResult =
  | { ok: true; upload: ImportUpload }
  | { ok: false; statusCode: number; message: I18nMessage }

const FILE_FIELD = "file"
/** A meet's results are a few hundred rows; anything larger is not this file. */
const MAX_BYTES = 5 * 1024 * 1024

export async function readImportUpload(event: H3Event): Promise<ImportUploadResult> {
  const contentType = getRequestHeader(event, "content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      statusCode: 400,
      message: { en: "Expected multipart form data", vi: "Yêu cầu dữ liệu multipart" },
    }
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    return {
      ok: false,
      statusCode: 400,
      message: { en: "Invalid or empty form data", vi: "Dữ liệu form không hợp lệ hoặc trống" },
    }
  }

  let csv: string | null = null
  const fields: Record<string, string> = {}
  for (const part of form) {
    if (!part.name) continue
    if (part.name === FILE_FIELD && part.data) {
      if (part.data.length > MAX_BYTES) {
        return {
          ok: false,
          statusCode: 413,
          message: { en: "The file is too large", vi: "Tệp quá lớn" },
        }
      }
      csv = part.data.toString("utf8")
    } else if (typeof part.data !== "undefined") {
      fields[part.name] = part.data.toString("utf8")
    }
  }

  if (csv === null) {
    return {
      ok: false,
      statusCode: 400,
      message: { en: "No CSV file was uploaded", vi: "Chưa có tệp CSV nào được tải lên" },
    }
  }

  const overrides: ImportOverrides = {}
  if (fields.overrides) {
    let raw: unknown
    try {
      raw = JSON.parse(fields.overrides)
    } catch {
      return {
        ok: false,
        statusCode: 400,
        message: { en: "Row overrides are not valid JSON", vi: "Tuỳ chọn theo dòng không phải JSON hợp lệ" },
      }
    }
    const parsed = ImportOverridesSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok: false,
        statusCode: 400,
        message: { en: "Row overrides are invalid", vi: "Tuỳ chọn theo dòng không hợp lệ" },
      }
    }
    for (const [line, value] of Object.entries(parsed.data)) {
      overrides[Number(line)] = value
    }
  }

  return { ok: true, upload: { csv, overrides, fields } }
}

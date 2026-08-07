import { z } from "zod"

/**
 * The admin's per-row decisions carried back from the preview table (§3.3):
 * bind an unmatched CSV line to a VPF id, or skip it — a guest lifter from
 * another federation may legitimately have no account here.
 *
 * Keyed by CSV line number as a string, because it arrives as JSON in a
 * multipart field alongside the file.
 */
export const ImportOverridesSchema = z.record(
  z.string().regex(/^\d+$/),
  z.object({
    vpfId: z.string().trim().min(1).optional(),
    skip: z.boolean().optional(),
  }),
)

export const ImportConfirmSchema = z.object({
  /** Checksum of the previewed parse; the server refuses to commit a different file. */
  checksum: z.string().min(1),
  overrides: ImportOverridesSchema.optional(),
})

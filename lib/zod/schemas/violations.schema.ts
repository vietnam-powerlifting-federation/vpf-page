import { z } from "zod"

/**
 * A violation is recorded against an athlete and expires at the end of a year
 * (admin tools spec §5.1).
 *
 * `expireYear` is nullable and **null means the violation never expires** — a
 * permanent sanction, which is not what a blank field usually implies. The API
 * therefore requires the caller to say so explicitly rather than inferring it
 * from an omitted key.
 */
export const ViolationCreateSchema = z.object({
  vpfId: z.string().trim().min(1),
  note: z.string().trim().min(1).max(1000),
  expireYear: z.number().int().min(1900).max(2200).nullable(),
  /** Must be true when `expireYear` is null, so a permanent ban is never an accident. */
  confirmPermanent: z.boolean().optional(),
}).refine((violation) => violation.expireYear !== null || violation.confirmPermanent === true, {
  message: "A violation with no expiry year never expires; confirm that explicitly",
  path: ["expireYear"],
})

export const ViolationPatchSchema = z.object({
  note: z.string().trim().min(1).max(1000).optional(),
  expireYear: z.number().int().min(1900).max(2200).nullable().optional(),
  confirmPermanent: z.boolean().optional(),
}).refine((violation) => violation.expireYear !== null || violation.confirmPermanent === true, {
  message: "A violation with no expiry year never expires; confirm that explicitly",
  path: ["expireYear"],
})

/**
 * Per-meet exclusion. The reason is shown to the athlete **verbatim** in the block
 * popup, and real reasons look like "đã giành HCV hạng cân 74 tại giải đấu X" —
 * this list is used for "already qualified, cannot re-enter" as much as for
 * discipline.
 */
export const CompetitionBanSchema = z.object({
  vpfId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
})

import { z } from "zod"

/**
 * Voucher issued by an admin. `code` and `createdBy` are set by the server, not
 * the client. The discount range mirrors the `chk_voucher_discount_value` check
 * constraint so a bad value is a 400 rather than a DB constraint violation.
 */
export const CreateVoucherSchema = z
  .object({
    vpfId: z.string().min(1),
    type: z.enum(["vip", "vpf_membership", "competition"]),
    discountKind: z.enum(["fixed", "percent"]),
    discountValue: z.coerce.number().int().positive(),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "expiresAt must be YYYY-MM-DD" }),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.discountKind !== "percent" || v.discountValue <= 100, {
    message: "percent discount must be between 1 and 100",
    path: ["discountValue"],
  })

export type CreateVoucher = z.infer<typeof CreateVoucherSchema>

/**
 * Editing an issued voucher (admin tools spec §8).
 *
 * Only the terms move: `code`, `vpfId` and `type` are what the athlete was told
 * and what the redemption constraints key on, and a redeemed voucher is frozen
 * outright — `discount_applied` fixed the VND at redemption precisely so editing
 * a voucher later never rewrites the price of a purchase already made.
 */
export const UpdateVoucherSchema = z
  .object({
    discountKind: z.enum(["fixed", "percent"]).optional(),
    discountValue: z.coerce.number().int().positive().optional(),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "expiresAt must be YYYY-MM-DD" }).optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => v.discountKind !== "percent" || (v.discountValue ?? 1) <= 100, {
    message: "percent discount must be between 1 and 100",
    path: ["discountValue"],
  })

/**
 * Issue one voucher each to many athletes at once (§8). A Tết promotion to 200
 * athletes is otherwise 200 clicks.
 *
 * Either name the athletes explicitly or take everyone with an active membership;
 * every voucher still gets its own unique code, because a shared code could not be
 * single-use per athlete.
 */
export const BulkVoucherSchema = z
  .object({
    vpfIds: z.array(z.string().trim().min(1)).min(1).max(1000).optional(),
    /** Mutually exclusive with `vpfIds`. */
    audience: z.enum(["active_members"]).optional(),
    type: z.enum(["vip", "vpf_membership", "competition"]),
    discountKind: z.enum(["fixed", "percent"]),
    discountValue: z.coerce.number().int().positive(),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => Boolean(v.vpfIds) !== Boolean(v.audience), {
    message: "Provide either a list of athletes or an audience, not both",
    path: ["vpfIds"],
  })
  .refine((v) => v.discountKind !== "percent" || v.discountValue <= 100, {
    message: "percent discount must be between 1 and 100",
    path: ["discountValue"],
  })

/** Query params for the athlete's own voucher list. */
export const VoucherListQuerySchema = z.object({
  type: z.enum(["vip", "vpf_membership", "competition"]).optional(),
  available: z
    .preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())
    .optional(),
})

export type VoucherListQuery = z.infer<typeof VoucherListQuerySchema>

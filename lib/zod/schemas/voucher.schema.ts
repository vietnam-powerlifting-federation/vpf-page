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

/** Query params for the athlete's own voucher list. */
export const VoucherListQuerySchema = z.object({
  type: z.enum(["vip", "vpf_membership", "competition"]).optional(),
  available: z
    .preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())
    .optional(),
})

export type VoucherListQuery = z.infer<typeof VoucherListQuerySchema>

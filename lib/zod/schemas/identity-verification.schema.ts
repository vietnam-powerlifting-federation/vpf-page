import { z } from "zod"

const currentYear = new Date().getFullYear()

/**
 * Personal information submitted in the identity verification form. `dob` is a
 * birth year (matching the users table convention). The ID card photo is handled
 * separately as a multipart file upload.
 */
export const IdentityVerificationSubmitSchema = z.object({
  fullName: z.string().trim().min(1),
  nationality: z.string().trim().min(1),
  dob: z.coerce.number().int().min(1900).max(currentYear),
  nationalId: z.string().trim().min(1),
  address: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(1),
})

export type IdentityVerificationSubmit = z.infer<typeof IdentityVerificationSubmitSchema>

/** Admin decision on an identity verification submission. */
export const IdentityVerificationReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(1000).optional(),
})

export type IdentityVerificationReview = z.infer<typeof IdentityVerificationReviewSchema>

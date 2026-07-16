import { z } from "zod"
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE } from "~/lib/constants/constants"

/** Multipart form fields arrive as strings; coerce "true"/"false" into booleans. */
const formBool = z.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())

const ALL_WEIGHT_CLASSES = [...new Set([...WEIGHT_CLASS_MALE, ...WEIGHT_CLASS_FEMALE])]

/**
 * Competition entry submitted from the wizard (multipart; the optional competition
 * photo is handled separately as a file part). Cross-field rules — data consent
 * required, membership terms required for members, division valid for age/capacity —
 * are enforced in the handler so each can return a specific bilingual message.
 */
export const CompetitionRegisterSchema = z.object({
  capacity: z.enum(["member", "guest"]),
  membershipTermsAccepted: formBool.optional().default(false),
  dataConsentAccepted: formBool,
  sex: z.enum(["male", "female"]),
  weightClass: z.coerce.number().int().refine((v) => ALL_WEIGHT_CLASSES.includes(v), { message: "invalid weight class" }),
  division: z.enum(["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"]),
  squatRackPin: z.coerce.number().int().min(0).max(30).optional(),
  benchRackPin: z.coerce.number().int().min(0).max(30).optional(),
  benchSafetyPin: z.coerce.number().int().min(0).max(30).optional(),
  benchFootBlock: z.coerce.number().int().min(0).max(30).optional(),
  mediaPlus: formBool.optional().default(false),
})

export type CompetitionRegister = z.infer<typeof CompetitionRegisterSchema>

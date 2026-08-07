import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

/**
 * Meet create/edit payload (admin tools spec §2).
 *
 * Every date is nullable and that nullability is meaningful, not laziness:
 * `isRegistrationOpen` reads a null `startRegistration` as "open on that side",
 * so the form must offer "no limit" rather than an empty date box.
 */
const meetFields = {
  meetName: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).nullable().optional(),
  /** The public URL. Derived from the name when omitted; uniqueness is enforced in the handler. */
  meetSlug: z.string().trim().regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only").max(160).optional(),
  startRegistration: isoDate.nullable().optional(),
  closeRegistration: isoDate.nullable().optional(),
  hostDate: isoDate.nullable().optional(),
  type: z.enum(["national", "amateur", "professional", "national_qualifier", "other"]).nullable().optional(),
  mediaLink: z.string().trim().max(500).nullable().optional(),
  /**
   * The record-eligibility year: `records.ts` derives an athlete's division from
   * `systemYear - dob`. Defaults from `hostDate` but stays editable, because a
   * January meet may belong to the previous season.
   */
  systemYear: z.number().int().min(1900).max(2200),
  hidden: z.boolean().optional(),
  allowSpotterRegistration: z.boolean().nullable().optional(),
  allowGuestRegistration: z.boolean().nullable().optional(),
  /** VND. Null reads as 0 in the fee calc, so "free" should be an explicit 0. */
  entryFee: z.number().int().min(0).nullable().optional(),
  /** Picks which results table backs the meet; effectively immutable once results exist. */
  legacy: z.boolean().nullable().optional(),
}

export const MeetCreateSchema = z.object(meetFields).refine(
  (meet) => !meet.startRegistration || !meet.closeRegistration || meet.startRegistration <= meet.closeRegistration,
  { message: "Registration closes before it opens", path: ["closeRegistration"] },
)

export const MeetPatchSchema = z.object(meetFields).partial().refine(
  (meet) => !meet.startRegistration || !meet.closeRegistration || meet.startRegistration <= meet.closeRegistration,
  { message: "Registration closes before it opens", path: ["closeRegistration"] },
)

/**
 * Cloning copies everything but the dates, the slug and the system year — annual
 * meets are near-identical year to year, and this is exactly where hand-written
 * SQL gets copy-pasted wrong.
 */
export const MeetCloneSchema = z.object({
  meetName: z.string().trim().min(1).max(200),
  meetSlug: z.string().trim().regex(/^[a-z0-9-]+$/).max(160).optional(),
  systemYear: z.number().int().min(1900).max(2200),
  hostDate: isoDate.nullable().optional(),
  startRegistration: isoDate.nullable().optional(),
  closeRegistration: isoDate.nullable().optional(),
})

/** Deleting a meet cascades to results, ban list and competition purchase metadata. */
export const MeetDeleteSchema = z.object({
  /** Must equal the meet's name — a typed confirmation naming what is being destroyed. */
  confirmName: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
})

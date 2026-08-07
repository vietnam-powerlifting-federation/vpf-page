import { z } from "zod"

const opener = z.number().min(0).max(999.99).nullable().optional()

/**
 * Meet-day logistics for one entry (admin tools spec §6.5). Everything here is
 * editable right up until results are imported, which is the whole reason
 * `meet_entries` exists as its own table.
 */
export const EntryPatchSchema = z.object({
  platform: z.string().trim().max(40).nullable().optional(),
  session: z.string().trim().max(40).nullable().optional(),
  flight: z.string().trim().max(40).nullable().optional(),
  lot: z.number().int().min(0).max(32767).nullable().optional(),
  teamId: z.number().int().nullable().optional(),

  sex: z.enum(["male", "female"]).optional(),
  weightClass: z.number().int().optional(),
  division: z.enum(["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"]).optional(),

  rawOrEquipped: z.string().trim().max(40).optional(),
  wasDrugTested: z.boolean().optional(),
  squatOpener: opener,
  benchOpener: opener,
  deadliftOpener: opener,
  additionalItems: z.string().trim().max(1000).nullable().optional(),

  /** A withdrawal is a fact worth keeping: the row stays, excluded from the export. */
  withdrawn: z.boolean().optional(),
})

/** Bulk assignment for a selection of entries — what session planning actually needs. */
export const EntryBulkAssignSchema = z.object({
  entryIds: z.array(z.number().int()).min(1).max(500),
  platform: z.string().trim().max(40).nullable().optional(),
  session: z.string().trim().max(40).nullable().optional(),
  flight: z.string().trim().max(40).nullable().optional(),
})

/** An athlete who paid at the venue. The purchase is raised separately. */
export const DoorEntrySchema = z.object({
  vpfId: z.string().trim().min(1),
  sex: z.enum(["male", "female"]),
  weightClass: z.number().int(),
  division: z.enum(["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"]),
  purchaseId: z.number().int().nullable().optional(),
})

import type { InferSelectModel } from "drizzle-orm"
import type { meetEntries } from "~/lib/external/drizzle/migrations/schema"
import type { PurchaseStatusValue } from "~/types/union-types"

export type MeetEntry = InferSelectModel<typeof meetEntries>

/**
 * One row of the entries roster (admin tools spec §6.5): the entry, the athlete
 * behind it, and whether they have actually paid.
 *
 * There is no `registrations` table — a registration *is* a purchase with
 * `'competition'` in `purchases.type` plus a `competition_purchase_metadata` row —
 * so payment state has to be carried alongside rather than read off the entry.
 */
export type MeetEntryWithAthlete = MeetEntry & {
  fullName: string
  email: string | null
  phoneNumber: string | null
  dob: number | null
  nationality: string | null
  address: string | null
  squatRackPin: number | null
  benchRackPin: number | null
  benchSafetyPin: number | null
  benchFootBlock: number | null
  teamName: string | null
  refCode: string | null
  purchaseStatus: PurchaseStatusValue | null
  mediaPlus: boolean | null
  /**
   * Set once results are imported: what the results CSV said about this athlete's
   * platform/session/flight/lot. A divergence means the meet was re-organised on
   * the day — useful to know, and harmless.
   */
  resultAssignment: {
    platform: string | null
    session: string | null
    flight: string | null
    lot: number | null
  } | null
}

export type EntryRoster = {
  meetId: number
  meetName: string
  entries: MeetEntryWithAthlete[]
  /** True once `meet_results` exists for the meet: the screen becomes read-only history. */
  resultsImported: boolean
  counts: {
    total: number
    withdrawn: number
    paid: number
    unpaid: number
  }
}

export type EntryGenerationResult = {
  meetId: number
  created: number
  /** Athletes who already had an entry; their assignments were left untouched. */
  skipped: number
}

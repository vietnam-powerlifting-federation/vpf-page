import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionPurchaseMetadata,
  meetEntries,
  meets,
  purchases,
  vouchers,
} from "~/lib/external/drizzle/migrations/schema"
import { ENTRY_EXPORT_COLUMNS } from "~/lib/utils/liftingcast-export"
import { parseCsvText } from "~/lib/utils/liftingcast-csv"
import { parseDivision, parseSex, parseWeightClass } from "~/lib/utils/liftingcast-mapping"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const

const MEET_ID = 9201
const REF_CODES = ["992001", "992002"]

async function importRoster() {
  return (await import("~/server/api/meets/[id]/entries/index.get")).default
}
async function importGenerate() {
  return (await import("~/server/api/meets/[id]/entries/generate.post")).default
}
async function importPatch() {
  return (await import("~/server/api/meets/[id]/entries/[entryId].patch")).default
}
async function importExport() {
  return (await import("~/server/api/meets/[id]/entries/export.csv.get")).default
}
async function importAssign() {
  return (await import("~/server/api/meets/[id]/entries/assign.patch")).default
}

function adminEvent(extra: Record<string, unknown> = {}) {
  return createMockH3Event({ params: { id: String(MEET_ID) }, context: { user: admin }, ...extra })
}

/** A paid registration: a purchase with 'competition' in its type, plus its metadata row. */
async function registerAndPay(vpfId: string, refCode: string, overrides: Record<string, unknown> = {}) {
  const [purchase] = await db
    .insert(purchases)
    .values({ vpfId, type: ["competition"], refCode, amount: 500000, status: "active" })
    .returning()
  await db.insert(competitionPurchaseMetadata).values({
    purchaseId: purchase.purchaseId,
    meetId: MEET_ID,
    sex: "male",
    weightClass: 83,
    division: "open",
    mediaPlus: false,
    ...overrides,
  })
  return purchase
}

describe("API: meet entries and the LiftingCast export", () => {
  beforeEach(async () => {
    await db.delete(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
    await db.delete(purchases).where(inArray(purchases.refCode, REF_CODES))
    await db.delete(meets).where(eq(meets.meetId, MEET_ID))
    await db.insert(meets).values({
      meetId: MEET_ID,
      meetName: "Entries Test Meet",
      meetSlug: "entries-test-meet",
      systemYear: 2026,
      hostDate: "2026-06-01",
      hidden: false,
    })
  })

  afterAll(async () => {
    await db.delete(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
    await db.delete(purchases).where(inArray(purchases.refCode, REF_CODES))
    await db.delete(meets).where(eq(meets.meetId, MEET_ID))
  })

  describe("POST /api/meets/[id]/entries/generate", () => {
    it("returns 403 for a non-admin", async () => {
      const handler = await importGenerate()
      const res = await handler(createMockH3Event({
        method: "POST",
        params: { id: String(MEET_ID) },
        context: { user },
      }))
      expect(res.success).toBe(false)
    })

    it("creates one entry per paid registration, seeded from the purchase", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0], { weightClass: 93, division: "mas1" })

      const handler = await importGenerate()
      const res = await handler(adminEvent({ method: "POST" }))

      expect(res.success).toBe(true)
      expect(res.data!.created).toBe(1)

      const [entry] = await db.select().from(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
      expect(entry.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(entry.weightClass).toBe(93)
      expect(entry.division).toBe("mas1")
      expect(entry.rawOrEquipped).toBe("Raw")
      expect(entry.withdrawn).toBe(false)
    })

    it("ignores registrations that have not been paid", async () => {
      const [pending] = await db
        .insert(purchases)
        .values({ vpfId: fixtureUsers[0].vpfId, type: ["competition"], refCode: REF_CODES[0], amount: 1, status: "pending" })
        .returning()
      await db.insert(competitionPurchaseMetadata).values({
        purchaseId: pending.purchaseId,
        meetId: MEET_ID,
        sex: "male",
        weightClass: 83,
        division: "open",
      })

      const handler = await importGenerate()
      const res = await handler(adminEvent({ method: "POST" }))
      expect(res.data!.created).toBe(0)
    })

    it("is idempotent: re-running adds the newly paid without disturbing assignments", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      const handler = await importGenerate()
      await handler(adminEvent({ method: "POST" }))

      // The meet director assigns a session, then another athlete pays.
      await db.update(meetEntries).set({ session: "2", flight: "B", lot: 42 }).where(eq(meetEntries.meetId, MEET_ID))
      await registerAndPay(fixtureUsers[2].vpfId, REF_CODES[1])

      const res = await handler(adminEvent({ method: "POST" }))
      expect(res.data!.created).toBe(1)
      expect(res.data!.skipped).toBe(1)

      const rows = await db.select().from(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
      expect(rows).toHaveLength(2)
      const assigned = rows.find((row) => row.vpfId === fixtureUsers[0].vpfId)!
      expect(assigned.session).toBe("2")
      expect(assigned.flight).toBe("B")
      expect(assigned.lot).toBe(42)
    })
  })

  describe("GET /api/meets/[id]/entries", () => {
    it("returns the roster with payment state and counts", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await (await importGenerate())(adminEvent({ method: "POST" }))

      const res = await (await importRoster())(adminEvent())
      expect(res.success).toBe(true)
      expect(res.data!.counts.total).toBe(1)
      expect(res.data!.counts.paid).toBe(1)
      expect(res.data!.resultsImported).toBe(false)
      expect(res.data!.entries[0].fullName).toBe(fixtureUsers[0].fullName)
      expect(res.data!.entries[0].purchaseStatus).toBe("active")
    })
  })

  describe("PATCH /api/meets/[id]/entries/[entryId]", () => {
    async function seedEntry() {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await (await importGenerate())(adminEvent({ method: "POST" }))
      const [entry] = await db.select().from(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
      return entry
    }

    it("assigns meet-day logistics and openers", async () => {
      const entry = await seedEntry()
      const res = await (await importPatch())(createMockH3Event({
        method: "PATCH",
        params: { id: String(MEET_ID), entryId: String(entry.entryId) },
        context: { user: admin },
        body: { platform: "2", session: "3", flight: "C", lot: 7, squatOpener: 180, wasDrugTested: true },
      }))

      expect(res.success).toBe(true)
      expect(res.data!.session).toBe("3")
      expect(res.data!.squatOpener).toBe(180)
      expect(res.data!.wasDrugTested).toBe(true)
    })

    it("rejects a weight class that is invalid for the entry's sex", async () => {
      // The same pair `chk_entry_weight_class_sex` enforces; caught here so staff
      // get a message rather than a constraint violation.
      const entry = await seedEntry()
      const res = await (await importPatch())(createMockH3Event({
        method: "PATCH",
        params: { id: String(MEET_ID), entryId: String(entry.entryId) },
        context: { user: admin },
        body: { weightClass: 84 },
      }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/not valid for male/i)
    })

    it("withdrawing releases the voucher attached to the registration", async () => {
      const entry = await seedEntry()
      await db.insert(vouchers).values({
        code: "VPF-ENTRY-TEST",
        vpfId: fixtureUsers[0].vpfId,
        type: "competition",
        discountKind: "percent",
        discountValue: 20,
        expiresAt: "2099-12-31",
        redeemedPurchaseId: entry.purchaseId,
        redeemedAt: new Date().toISOString(),
        discountApplied: 100000,
      })

      await (await importPatch())(createMockH3Event({
        method: "PATCH",
        params: { id: String(MEET_ID), entryId: String(entry.entryId) },
        context: { user: admin },
        body: { withdrawn: true },
      }))

      const voucher = await db
        .select()
        .from(vouchers)
        .where(eq(vouchers.code, "VPF-ENTRY-TEST"))
        .then((rows) => rows[0])!
      expect(voucher.redeemedPurchaseId).toBeNull()
      expect(voucher.discountApplied).toBeNull()

      await db.delete(vouchers).where(eq(vouchers.code, "VPF-ENTRY-TEST"))
    })
  })

  describe("PATCH /api/meets/[id]/entries/assign", () => {
    it("bulk-sets session and flight across a selection", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await registerAndPay(fixtureUsers[2].vpfId, REF_CODES[1])
      await (await importGenerate())(adminEvent({ method: "POST" }))
      const rows = await db.select().from(meetEntries).where(eq(meetEntries.meetId, MEET_ID))

      const res = await (await importAssign())(adminEvent({
        method: "PATCH",
        body: { entryIds: rows.map((row) => row.entryId), session: "1", flight: "A" },
      }))

      expect(res.data!.updated).toBe(2)
      const updated = await db.select().from(meetEntries).where(eq(meetEntries.meetId, MEET_ID))
      expect(updated.every((row) => row.session === "1" && row.flight === "A")).toBe(true)
    })
  })

  describe("GET /api/meets/[id]/entries/export.csv", () => {
    it("emits the 29 columns in order, with vpfId as the member number", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await (await importGenerate())(adminEvent({ method: "POST" }))

      const csv = await (await importExport())(adminEvent()) as string
      const table = parseCsvText(csv)

      expect(table[0]).toEqual([...ENTRY_EXPORT_COLUMNS])
      expect(table).toHaveLength(2)

      const row = Object.fromEntries(ENTRY_EXPORT_COLUMNS.map((column, i) => [column, table[1][i]]))
      // The join key that brings results home in §3.3.
      expect(row.memberNumber).toBe(fixtureUsers[0].vpfId)
      expect(row.name).toBe(fixtureUsers[0].fullName)
      expect(row.gender).toBe("MALE")
      expect(row.division).toBe("Open")
      expect(row.declaredAwardsWeightClass).toBe("83")
      // users.dob is a year, so only a placeholder date can be emitted (§6.4).
      expect(row.birthDate).toBe(`${fixtureUsers[0].dob}-01-01`)
      // Weigh-in happens in LiftingCast.
      expect(row.bodyWeight).toBe("")
      expect(row.emergencyContactName).toBe("")
    })

    it("round-trips: what the export writes, the importer reads back", async () => {
      // The reverse-mapping rule (§6.3). If these two directions drift, a meet
      // exports fine and fails to import days later with the results in hand.
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0], { weightClass: 999, division: "mas2" })
      await (await importGenerate())(adminEvent({ method: "POST" }))

      const csv = await (await importExport())(adminEvent()) as string
      const table = parseCsvText(csv)
      const row = Object.fromEntries(ENTRY_EXPORT_COLUMNS.map((column, i) => [column, table[1][i]]))

      expect(row.declaredAwardsWeightClass).toBe("120+")
      expect(parseSex(row.gender)).toBe("male")
      expect(parseDivision(row.division)).toBe("mas2")
      expect(parseWeightClass(row.declaredAwardsWeightClass, "male")).toBe(999)
    })

    it("excludes withdrawn entries", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await registerAndPay(fixtureUsers[2].vpfId, REF_CODES[1])
      await (await importGenerate())(adminEvent({ method: "POST" }))
      await db
        .update(meetEntries)
        .set({ withdrawn: true })
        .where(eq(meetEntries.vpfId, fixtureUsers[2].vpfId))

      const csv = await (await importExport())(adminEvent()) as string
      expect(parseCsvText(csv)).toHaveLength(2)
    })

    it("folds the rack settings LiftingCast has no column for into additionalItems", async () => {
      await registerAndPay(fixtureUsers[0].vpfId, REF_CODES[0])
      await (await importGenerate())(adminEvent({ method: "POST" }))
      const { users } = await import("~/lib/external/drizzle/migrations/schema")
      await db
        .update(users)
        .set({ benchSafetyPin: 4, benchFootBlock: 2 })
        .where(eq(users.vpfId, fixtureUsers[0].vpfId))

      const csv = await (await importExport())(adminEvent()) as string
      const table = parseCsvText(csv)
      const row = Object.fromEntries(ENTRY_EXPORT_COLUMNS.map((column, i) => [column, table[1][i]]))
      expect(row.additionalItems).toContain("Bench safety pin: 4")
      expect(row.additionalItems).toContain("Bench foot block: 2")

      await db
        .update(users)
        .set({ benchSafetyPin: 0, benchFootBlock: 0 })
        .where(eq(users.vpfId, fixtureUsers[0].vpfId))
    })

    it("returns 403 for a non-admin", async () => {
      const res = await (await importExport())(createMockH3Event({
        params: { id: String(MEET_ID) },
        context: { user },
      }))
      expect((res as { success: boolean }).success).toBe(false)
    })
  })
})

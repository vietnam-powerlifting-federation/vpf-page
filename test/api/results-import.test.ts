import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meetResults, meets, teams } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"
import { buildLiftingCastCsv, importUploadParts, withDerivedTotals } from "../utils/liftingcast"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const

/** A meet of its own, so the fixture results seeded for meet 9001 stay untouched. */
const MEET_ID = 9101
const MEET_SLUG = "import-test-meet"
const IMPORT_TEAM = "Import Test Team"

async function importPreview() {
  return (await import("~/server/api/meets/[id]/results/import.post")).default
}
async function importConfirm() {
  return (await import("~/server/api/meets/[id]/results/import/confirm.post")).default
}

function previewEvent(csv: string, extra: Record<string, string> = {}, context: object = { user: admin }) {
  return createMockH3Event({
    method: "POST",
    params: { id: String(MEET_ID) },
    context,
    multipart: importUploadParts(csv, extra),
  })
}

/** Athlete one, matched by Member #. Squat 110 / bench 90 / deadlift 140 = 340. */
const rowOne = withDerivedTotals({
  Name: fixtureUsers[0].fullName,
  Gender: "MALE",
  "Awards Division": "Men's Raw Open",
  "Body Weight (kg)": "82.50",
  "Weight Class": "83",
  "Squat 1": 100, "Squat 2": 105, "Squat 3": 110,
  "Bench 1": 80, "Bench 2": 85, "Bench 3": 90,
  "Deadlift 1": 120, "Deadlift 2": 130, "Deadlift 3": 140,
  Place: 1,
  Lot: 11,
  Team: IMPORT_TEAM,
  "Member #": fixtureUsers[0].vpfId,
  "Birth Date": "12/03/1995",
})

/** Athlete two, female, in the 63 class. */
const rowTwo = withDerivedTotals({
  Name: fixtureUsers[2].fullName,
  Gender: "FEMALE",
  "Awards Division": "Women's Raw Open",
  "Body Weight (kg)": "62.00",
  "Weight Class": "63",
  "Squat 1": 80, "Squat 2": 85, "Squat 3": -90,
  "Bench 1": 50, "Bench 2": 55, "Bench 3": null,
  "Deadlift 1": 90, "Deadlift 2": 95, "Deadlift 3": null,
  Place: 1,
  Lot: 12,
  "Member #": fixtureUsers[2].vpfId,
  "Birth Date": "01/01/2000",
})

describe("API: LiftingCast results import", () => {
  beforeEach(async () => {
    await db.delete(meetResults).where(eq(meetResults.meetId, MEET_ID))
    await db.delete(meets).where(eq(meets.meetId, MEET_ID))
    await db.insert(meets).values({
      meetId: MEET_ID,
      meetName: "Import Test Meet",
      meetSlug: MEET_SLUG,
      systemYear: 2024,
      hostDate: "2024-08-01",
      hidden: false,
      legacy: false,
    })
  })

  afterAll(async () => {
    await db.delete(meetResults).where(eq(meetResults.meetId, MEET_ID))
    await db.delete(meets).where(eq(meets.meetId, MEET_ID))
    await db.delete(teams).where(inArray(teams.teamName, [IMPORT_TEAM]))
  })

  describe("POST /api/meets/[id]/results/import (preview)", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne]), {}, {}))
      expect(res.success).toBe(false)
    })

    it("returns 403 for a non-admin", async () => {
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne]), {}, { user }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/admin/i)
    })

    it("resolves rows and writes nothing", async () => {
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne, rowTwo])))

      expect(res.success).toBe(true)
      expect(res.data!.blocked).toBe(false)
      expect(res.data!.counts.create).toBe(2)
      expect(res.data!.rows[0].match.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data!.rows[0].match.method).toBe("member")
      expect(res.data!.teamsToCreate).toEqual([IMPORT_TEAM])

      const written = await db.select().from(meetResults).where(eq(meetResults.meetId, MEET_ID))
      expect(written).toHaveLength(0)
    })

    it("derives the best lifts, total, GL points and placement the site will show", async () => {
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne])))
      const derived = res.data!.rows[0].derived

      expect(derived.bestSquat).toBe(110)
      expect(derived.bestBench).toBe(90)
      expect(derived.bestDeadlift).toBe(140)
      expect(derived.total).toBe(340)
      expect(derived.gl).toBeGreaterThan(0)
      expect(derived.placement).toBe(1)
      expect(derived.disqualified).toBe(false)
    })

    it("flags the bodyweight trap: a class the athlete weighed out of", async () => {
      // 74.5 kg entered in the 74 class parses cleanly and disqualifies silently.
      // The whole point of the preview step is that this is visible first.
      const trap = withDerivedTotals({
        ...rowOne,
        "Body Weight (kg)": "74.50",
        "Weight Class": "74",
      })
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([trap])))

      expect(res.success).toBe(true)
      expect(res.data!.blocked).toBe(false)
      const derived = res.data!.rows[0].derived
      expect(derived.disqualified).toBe(true)
      expect(derived.dqReasons.map((r) => r.en).join(" ")).toMatch(/74\.5.*outside weight class 74/)
    })

    it("blocks an unmatched athlete and offers a skip", async () => {
      const stranger = withDerivedTotals({ ...rowOne, Name: "Nobody At All", "Member #": "VPF999999" })
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([stranger])))

      expect(res.data!.blocked).toBe(true)
      expect(res.data!.rows[0].row.issues.map((i) => i.code)).toContain("athlete.unmatched")
    })

    it("honours a per-row skip override", async () => {
      const stranger = withDerivedTotals({ ...rowOne, Name: "Nobody At All", "Member #": "VPF999999" })
      const handler = await importPreview()
      const res = await handler(previewEvent(
        buildLiftingCastCsv([stranger]),
        { overrides: JSON.stringify({ 1: { skip: true } }) },
      ))

      expect(res.data!.blocked).toBe(false)
      expect(res.data!.rows[0].action).toBe("skip")
    })

    it("refuses a legacy meet outright", async () => {
      await db.update(meets).set({ legacy: true }).where(eq(meets.meetId, MEET_ID))
      const handler = await importPreview()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne])))

      expect(res.data!.blocked).toBe(true)
      expect(res.data!.issues[0].code).toBe("meet.legacy")
    })
  })

  describe("POST /api/meets/[id]/results/import/confirm", () => {
    async function preview(csv: string) {
      const handler = await importPreview()
      const res = await handler(previewEvent(csv))
      expect(res.success).toBe(true)
      return res.data!
    }

    it("writes the previewed rows in one transaction", async () => {
      const csv = buildLiftingCastCsv([rowOne, rowTwo])
      const { checksum } = await preview(csv)

      const handler = await importConfirm()
      const res = await handler(previewEvent(csv, { checksum }))

      expect(res.success).toBe(true)
      expect(res.data!.created).toBe(2)
      expect(res.data!.teamsCreated).toEqual([IMPORT_TEAM])

      const written = await db.select().from(meetResults).where(eq(meetResults.meetId, MEET_ID))
      expect(written).toHaveLength(2)
      const first = written.find((row) => row.vpfId === fixtureUsers[0].vpfId)!
      expect(first.squat3).toBe(110)
      expect(first.bench3).toBe(90)
      expect(first.weightClass).toBe(83)
      expect(first.division).toBe("open")
      expect(first.teamId).not.toBeNull()
    })

    it("stores failed attempts as negatives, verbatim", async () => {
      const csv = buildLiftingCastCsv([rowTwo])
      const { checksum } = await preview(csv)
      const handler = await importConfirm()
      await handler(previewEvent(csv, { checksum }))

      const row = await db
        .select()
        .from(meetResults)
        .where(and(eq(meetResults.meetId, MEET_ID), eq(meetResults.vpfId, fixtureUsers[2].vpfId)))
        .then((rows) => rows[0])!

      expect(row.squat3).toBe(-90)
      expect(row.bench3).toBeNull()
    })

    it("is idempotent: importing the same file twice changes nothing", async () => {
      const csv = buildLiftingCastCsv([rowOne, rowTwo])
      const handler = await importConfirm()

      const first = await preview(csv)
      await handler(previewEvent(csv, { checksum: first.checksum }))

      const second = await preview(csv)
      expect(second.counts.unchanged).toBe(2)
      expect(second.counts.create).toBe(0)

      const res = await handler(previewEvent(csv, { checksum: second.checksum }))
      expect(res.data!.created).toBe(0)
      expect(res.data!.updated).toBe(2)
      expect(res.data!.deleted).toBe(0)

      const written = await db.select().from(meetResults).where(eq(meetResults.meetId, MEET_ID))
      expect(written).toHaveLength(2)
    })

    it("is a declarative replace: a lifter dropped from the CSV is deleted", async () => {
      const handler = await importConfirm()
      const both = buildLiftingCastCsv([rowOne, rowTwo])
      const firstPreview = await preview(both)
      await handler(previewEvent(both, { checksum: firstPreview.checksum }))

      const onlyOne = buildLiftingCastCsv([rowOne])
      const secondPreview = await preview(onlyOne)
      expect(secondPreview.deletions.map((d) => d.vpfId)).toEqual([fixtureUsers[2].vpfId])

      const res = await handler(previewEvent(onlyOne, { checksum: secondPreview.checksum }))
      expect(res.data!.deleted).toBe(1)

      const written = await db.select().from(meetResults).where(eq(meetResults.meetId, MEET_ID))
      expect(written.map((row) => row.vpfId)).toEqual([fixtureUsers[0].vpfId])
    })

    it("preserves an admin's `ranked` decision across a re-import", async () => {
      const csv = buildLiftingCastCsv([rowOne])
      const handler = await importConfirm()
      const first = await preview(csv)
      await handler(previewEvent(csv, { checksum: first.checksum }))

      // The admin deliberately un-ranks the row; the next import must not undo it.
      await db
        .update(meetResults)
        .set({ ranked: false, showOnProfile: false })
        .where(and(eq(meetResults.meetId, MEET_ID), eq(meetResults.vpfId, fixtureUsers[0].vpfId)))

      const second = await preview(csv)
      await handler(previewEvent(csv, { checksum: second.checksum }))

      const row = await db
        .select()
        .from(meetResults)
        .where(and(eq(meetResults.meetId, MEET_ID), eq(meetResults.vpfId, fixtureUsers[0].vpfId)))
        .then((rows) => rows[0])!

      expect(row.ranked).toBe(false)
      expect(row.showOnProfile).toBe(false)
    })

    it("imports a guest-division row unranked", async () => {
      const guest = withDerivedTotals({ ...rowOne, "Awards Division": "Guest" })
      const csv = buildLiftingCastCsv([guest])
      const { checksum } = await preview(csv)
      const handler = await importConfirm()
      await handler(previewEvent(csv, { checksum }))

      const row = await db
        .select()
        .from(meetResults)
        .where(and(eq(meetResults.meetId, MEET_ID), eq(meetResults.vpfId, fixtureUsers[0].vpfId)))
        .then((rows) => rows[0])!

      expect(row.division).toBe("guest")
      expect(row.ranked).toBe(false)
    })

    it("refuses a file that differs from the one previewed", async () => {
      const { checksum } = await preview(buildLiftingCastCsv([rowOne]))
      const tampered = buildLiftingCastCsv([withDerivedTotals({ ...rowOne, "Squat 3": 200 })])

      const handler = await importConfirm()
      const res = await handler(previewEvent(tampered, { checksum }))

      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/no longer matches/i)
      expect(await db.select().from(meetResults).where(eq(meetResults.meetId, MEET_ID))).toHaveLength(0)
    })

    it("refuses to commit while blocking errors remain", async () => {
      const stranger = withDerivedTotals({ ...rowOne, Name: "Nobody At All", "Member #": "VPF999999" })
      const csv = buildLiftingCastCsv([stranger])
      const { checksum } = await preview(csv)

      const handler = await importConfirm()
      const res = await handler(previewEvent(csv, { checksum }))

      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/blocking errors/i)
    })

    it("requires the checksum", async () => {
      const handler = await importConfirm()
      const res = await handler(previewEvent(buildLiftingCastCsv([rowOne])))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/checksum/i)
    })

    it("returns 403 for a non-admin", async () => {
      const csv = buildLiftingCastCsv([rowOne])
      const handler = await importConfirm()
      const res = await handler(previewEvent(csv, { checksum: "x" }, { user }))
      expect(res.success).toBe(false)
    })
  })
})

import { describe, it, expect, afterEach, afterAll } from "vitest"
import { eq, inArray, like } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { competitionPurchaseMetadata, meetResults, meets, purchases } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers, fixtureMeets } from "../fixtures/data"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const

const SLUG_PREFIX = "admin-crud-"

async function importList() {
  return (await import("~/server/api/meets/index")).default
}
async function importCreate() {
  return (await import("~/server/api/meets/index.post")).default
}
async function importPatch() {
  return (await import("~/server/api/meets/[id]/index.patch")).default
}
async function importDelete() {
  return (await import("~/server/api/meets/[id]/index.delete")).default
}
async function importClone() {
  return (await import("~/server/api/meets/[id]/clone.post")).default
}

async function createMeet(body: Record<string, unknown> = {}) {
  const handler = await importCreate()
  return handler(createMockH3Event({
    method: "POST",
    context: { user: admin },
    body: { meetName: "Admin CRUD Meet", meetSlug: `${SLUG_PREFIX}base`, systemYear: 2026, ...body },
  }))
}

async function cleanup() {
  await db.delete(meets).where(like(meets.meetSlug, `${SLUG_PREFIX}%`))
}

describe("API: admin meet CRUD", () => {
  afterEach(cleanup)
  afterAll(cleanup)

  describe("POST /api/meets", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = await importCreate()
      const res = await handler(createMockH3Event({ method: "POST", context: {}, body: {} }))
      expect(res.success).toBe(false)
    })

    it("returns 403 for a non-admin", async () => {
      const handler = await importCreate()
      const res = await handler(createMockH3Event({
        method: "POST",
        context: { user },
        body: { meetName: "Nope", systemYear: 2026 },
      }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/admin/i)
    })

    it("creates a meet, hidden by default", async () => {
      const res = await createMeet()
      expect(res.success).toBe(true)
      expect(res.data!.meetSlug).toBe(`${SLUG_PREFIX}base`)
      // A half-configured meet on the public site is worse than one nobody sees.
      expect(res.data!.hidden).toBe(true)
    })

    it("derives a slug from the name when none is given", async () => {
      const handler = await importCreate()
      const res = await handler(createMockH3Event({
        method: "POST",
        context: { user: admin },
        body: { meetName: "Giải Vô Địch Quốc Gia 2026", systemYear: 2026 },
      }))
      expect(res.success).toBe(true)
      // Vietnamese diacritics fold to ASCII so the public URL stays typeable.
      expect(res.data!.meetSlug).toBe("giai-vo-dich-quoc-gia-2026")
      await db.delete(meets).where(eq(meets.meetId, res.data!.meetId))
    })

    it("rejects a slug already in use", async () => {
      await createMeet()
      const res = await createMeet({ meetName: "Another" })
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/already used/i)
    })

    it("rejects a registration window that closes before it opens", async () => {
      const res = await createMeet({ startRegistration: "2026-05-01", closeRegistration: "2026-04-01" })
      expect(res.success).toBe(false)
    })
  })

  describe("GET /api/meets", () => {
    it("hides hidden meets from everyone by default", async () => {
      const handler = await importList()
      const res = await handler(createMockH3Event({ context: { user: admin } }))
      expect(res.success).toBe(true)
      expect(res.data!.some((meet) => meet.meetId === fixtureMeets[1].meetId)).toBe(false)
    })

    it("includes hidden meets for an admin who asks", async () => {
      const handler = await importList()
      const res = await handler(createMockH3Event({
        context: { user: admin },
        query: { includeHidden: "true" },
      }))
      expect(res.data!.some((meet) => meet.meetId === fixtureMeets[1].meetId)).toBe(true)
    })

    it("ignores includeHidden for a non-admin", async () => {
      const handler = await importList()
      const res = await handler(createMockH3Event({
        context: { user },
        query: { includeHidden: "true" },
      }))
      expect(res.data!.some((meet) => meet.meetId === fixtureMeets[1].meetId)).toBe(false)
    })
  })

  describe("PATCH /api/meets/[id]", () => {
    it("updates a meet by id", async () => {
      const created = await createMeet()
      const handler = await importPatch()
      const res = await handler(createMockH3Event({
        method: "PATCH",
        params: { id: String(created.data!.meetId) },
        context: { user: admin },
        body: { hidden: false, entryFee: 500000, city: "Hà Nội" },
      }))
      expect(res.success).toBe(true)
      expect(res.data!.hidden).toBe(false)
      expect(res.data!.entryFee).toBe(500000)
      expect(res.data!.city).toBe("Hà Nội")
    })

    it("refuses to flip `legacy` once results exist", async () => {
      const created = await createMeet()
      await db.insert(meetResults).values({
        meetId: created.data!.meetId,
        vpfId: fixtureUsers[0].vpfId,
        sex: "male",
        weightClass: 83,
        division: "open",
        bodyWeight: 82,
      })

      const handler = await importPatch()
      const res = await handler(createMockH3Event({
        method: "PATCH",
        params: { id: String(created.data!.meetId) },
        context: { user: admin },
        body: { legacy: true },
      }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/already has results/i)

      await db.delete(meetResults).where(eq(meetResults.meetId, created.data!.meetId))
    })
  })

  describe("POST /api/meets/[id]/clone", () => {
    it("copies everything but the dates, slug and system year", async () => {
      const source = await createMeet({
        hidden: false,
        entryFee: 400000,
        city: "Hồ Chí Minh",
        type: "national",
        hostDate: "2026-06-01",
        allowGuestRegistration: false,
      })

      const handler = await importClone()
      const res = await handler(createMockH3Event({
        method: "POST",
        params: { id: String(source.data!.meetId) },
        context: { user: admin },
        body: { meetName: "Admin CRUD Meet 2027", meetSlug: `${SLUG_PREFIX}clone`, systemYear: 2027, hostDate: "2027-06-01" },
      }))

      expect(res.success).toBe(true)
      expect(res.data!.entryFee).toBe(400000)
      expect(res.data!.city).toBe("Hồ Chí Minh")
      expect(res.data!.type).toBe("national")
      expect(res.data!.allowGuestRegistration).toBe(false)
      expect(res.data!.systemYear).toBe(2027)
      expect(res.data!.hostDate).toBe("2027-06-01")
      // Always hidden, so a half-dated copy never appears publicly.
      expect(res.data!.hidden).toBe(true)
    })
  })

  describe("DELETE /api/meets/[id]", () => {
    it("requires the meet name typed back", async () => {
      const created = await createMeet()
      const handler = await importDelete()
      const res = await handler(createMockH3Event({
        method: "DELETE",
        params: { id: String(created.data!.meetId) },
        context: { user: admin },
        body: { confirmName: "Wrong Name", reason: "created by mistake" },
      }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/does not match/i)
    })

    it("deletes a meet nothing depends on", async () => {
      const created = await createMeet()
      const handler = await importDelete()
      const res = await handler(createMockH3Event({
        method: "DELETE",
        params: { id: String(created.data!.meetId) },
        context: { user: admin },
        body: { confirmName: "Admin CRUD Meet", reason: "created by mistake" },
      }))
      expect(res.success).toBe(true)
      expect(await db.select().from(meets).where(eq(meets.meetId, created.data!.meetId))).toHaveLength(0)
    })

    it("refuses when registrations exist, so paid entries are never destroyed", async () => {
      const created = await createMeet()
      const [purchase] = await db
        .insert(purchases)
        .values({ vpfId: fixtureUsers[0].vpfId, type: ["competition"], refCode: "991001", amount: 1000, status: "active" })
        .returning()
      await db.insert(competitionPurchaseMetadata).values({
        purchaseId: purchase.purchaseId,
        meetId: created.data!.meetId,
        sex: "male",
        weightClass: 83,
        division: "open",
      })

      const handler = await importDelete()
      const res = await handler(createMockH3Event({
        method: "DELETE",
        params: { id: String(created.data!.meetId) },
        context: { user: admin },
        body: { confirmName: "Admin CRUD Meet", reason: "cleanup" },
      }))

      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/hide it instead/i)

      await db.delete(purchases).where(inArray(purchases.purchaseId, [purchase.purchaseId]))
    })
  })
})

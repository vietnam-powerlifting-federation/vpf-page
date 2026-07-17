import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const
const user2 = { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } as const

const FUTURE_DATE = "2099-12-31"
const PAST_DATE = "2020-01-01"
const OWNERS = [user.vpfId, user2.vpfId]

async function importList() {
  return (await import("~/server/api/vouchers/index.get")).default
}
async function importCreate() {
  return (await import("~/server/api/vouchers/index.post")).default
}
async function importDelete() {
  return (await import("~/server/api/vouchers/[code]/index.delete")).default
}
async function importAdminList() {
  return (await import("~/server/api/vouchers/all.get")).default
}

async function issue(values: Partial<typeof vouchers.$inferInsert> & { code: string }) {
  const [row] = await db
    .insert(vouchers)
    .values({
      vpfId: user.vpfId,
      type: "competition",
      discountKind: "percent",
      discountValue: 20,
      expiresAt: FUTURE_DATE,
      ...values,
    })
    .returning()
  return row
}

describe("API: vouchers", () => {
  beforeEach(async () => {
    await db.delete(vouchers).where(inArray(vouchers.vpfId, OWNERS))
  })

  afterAll(async () => {
    await db.delete(vouchers).where(inArray(vouchers.vpfId, OWNERS))
    await db.delete(purchases).where(inArray(purchases.vpfId, OWNERS))
  })

  describe("GET /api/vouchers", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = await importList()
      const res = await handler(createMockH3Event({ context: {} }))
      expect(res.success).toBe(false)
    })

    it("returns only the athlete's own vouchers", async () => {
      await issue({ code: "VPF-LIST-MINE" })
      await issue({ code: "VPF-LIST-THEIRS", vpfId: user2.vpfId })
      const handler = await importList()
      const res = await handler(createMockH3Event({ context: { user } }))
      expect(res.success).toBe(true)
      expect(res.data?.map((v) => v.code)).toEqual(["VPF-LIST-MINE"])
    })

    it("derives status: used wins over expired", async () => {
      const [purchase] = await db
        .insert(purchases)
        .values({ vpfId: user.vpfId, type: ["competition"], refCode: "999001", amount: 0, status: "active" })
        .returning()
      await issue({
        code: "VPF-LIST-USED",
        expiresAt: PAST_DATE,
        redeemedPurchaseId: purchase.purchaseId,
        redeemedAt: new Date().toISOString(),
        discountApplied: 1000,
      })
      await issue({ code: "VPF-LIST-EXP", expiresAt: PAST_DATE })
      await issue({ code: "VPF-LIST-ACT" })

      const handler = await importList()
      const res = await handler(createMockH3Event({ context: { user } }))
      const byCode = Object.fromEntries(res.data!.map((v) => [v.code, v]))
      expect(byCode["VPF-LIST-USED"].status).toBe("used")
      expect(byCode["VPF-LIST-USED"].redeemedRefCode).toBe("999001")
      expect(byCode["VPF-LIST-EXP"].status).toBe("expired")
      expect(byCode["VPF-LIST-ACT"].status).toBe("active")
    })

    it("filters to unredeemed and unexpired with ?available=true", async () => {
      await issue({ code: "VPF-AV-OK" })
      await issue({ code: "VPF-AV-EXP", expiresAt: PAST_DATE })
      const handler = await importList()
      const res = await handler(createMockH3Event({ context: { user }, query: { available: "true" } }))
      expect(res.data?.map((v) => v.code)).toEqual(["VPF-AV-OK"])
    })

    it("filters by ?type=", async () => {
      await issue({ code: "VPF-T-COMP", type: "competition" })
      await issue({ code: "VPF-T-VIP", type: "vip" })
      const handler = await importList()
      const res = await handler(createMockH3Event({ context: { user }, query: { type: "vip" } }))
      expect(res.data?.map((v) => v.code)).toEqual(["VPF-T-VIP"])
    })
  })

  describe("POST /api/vouchers", () => {
    const body = {
      vpfId: user.vpfId,
      type: "competition",
      discountKind: "percent",
      discountValue: 20,
      expiresAt: FUTURE_DATE,
    }

    it("returns 403 for a non-admin", async () => {
      const handler = await importCreate()
      const res = await handler(createMockH3Event({ method: "POST", body, context: { user } }))
      expect(res.success).toBe(false)
    })

    it("issues a voucher with a generated code and createdBy", async () => {
      const handler = await importCreate()
      const res = await handler(
        createMockH3Event({ method: "POST", body: { ...body, note: "Tết promo" }, context: { user: admin } }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.code).toMatch(/^VPF-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
      expect(res.data?.status).toBe("active")
      expect(res.data?.note).toBe("Tết promo")

      const row = await db
        .select()
        .from(vouchers)
        .where(eq(vouchers.voucherId, res.data!.voucherId))
        .then((r) => r[0])
      expect(row.createdBy).toBe(admin.vpfId)
      expect(row.vpfId).toBe(user.vpfId)
    })

    it("returns 404 for an unknown athlete", async () => {
      const handler = await importCreate()
      const res = await handler(
        createMockH3Event({ method: "POST", body: { ...body, vpfId: "VPF999999" }, context: { user: admin } }),
      )
      expect(res.success).toBe(false)
    })

    it("returns 400 for a percent discount above 100", async () => {
      const handler = await importCreate()
      const res = await handler(
        createMockH3Event({ method: "POST", body: { ...body, discountValue: 101 }, context: { user: admin } }),
      )
      expect(res.success).toBe(false)
    })

    it("returns 400 for a non-positive fixed discount", async () => {
      const handler = await importCreate()
      const res = await handler(
        createMockH3Event({
          method: "POST",
          body: { ...body, discountKind: "fixed", discountValue: 0 },
          context: { user: admin },
        }),
      )
      expect(res.success).toBe(false)
    })

    it("returns 400 for an expiry in the past", async () => {
      const handler = await importCreate()
      const res = await handler(
        createMockH3Event({ method: "POST", body: { ...body, expiresAt: PAST_DATE }, context: { user: admin } }),
      )
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/past/i)
    })
  })

  describe("DELETE /api/vouchers/[code]", () => {
    it("returns 403 for a non-admin", async () => {
      await issue({ code: "VPF-DEL-403" })
      const handler = await importDelete()
      const res = await handler(
        createMockH3Event({ method: "DELETE", params: { code: "VPF-DEL-403" }, context: { user } }),
      )
      expect(res.success).toBe(false)
    })

    it("returns 404 for an unknown code", async () => {
      const handler = await importDelete()
      const res = await handler(
        createMockH3Event({ method: "DELETE", params: { code: "VPF-NOPE-NOPE" }, context: { user: admin } }),
      )
      expect(res.success).toBe(false)
    })

    it("revokes an unredeemed voucher", async () => {
      const issued = await issue({ code: "VPF-DEL-OK" })
      const handler = await importDelete()
      const res = await handler(
        createMockH3Event({ method: "DELETE", params: { code: "VPF-DEL-OK" }, context: { user: admin } }),
      )
      expect(res.success).toBe(true)

      const rows = await db.select().from(vouchers).where(eq(vouchers.voucherId, issued.voucherId))
      expect(rows).toHaveLength(0)
    })

    it("refuses to revoke a redeemed voucher — it is price history", async () => {
      const [purchase] = await db
        .insert(purchases)
        .values({ vpfId: user.vpfId, type: ["competition"], refCode: "999002", amount: 0, status: "active" })
        .returning()
      const issued = await issue({
        code: "VPF-DEL-USED",
        redeemedPurchaseId: purchase.purchaseId,
        redeemedAt: new Date().toISOString(),
        discountApplied: 5000,
      })
      const handler = await importDelete()
      const res = await handler(
        createMockH3Event({ method: "DELETE", params: { code: "VPF-DEL-USED" }, context: { user: admin } }),
      )
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/redeemed/i)

      const rows = await db.select().from(vouchers).where(eq(vouchers.voucherId, issued.voucherId))
      expect(rows).toHaveLength(1)
    })
  })

  describe("GET /api/vouchers/all", () => {
    it("returns 403 for a non-admin", async () => {
      const handler = await importAdminList()
      const res = await handler(createMockH3Event({ context: { user } }))
      expect(res.success).toBe(false)
    })

    it("returns every athlete's vouchers with owner identity", async () => {
      await issue({ code: "VPF-ALL-1" })
      await issue({ code: "VPF-ALL-2", vpfId: user2.vpfId })
      const handler = await importAdminList()
      const res = await handler(createMockH3Event({ context: { user: admin } }))
      expect(res.success).toBe(true)
      const codes = res.data!.map((v) => v.code)
      expect(codes).toContain("VPF-ALL-1")
      expect(codes).toContain("VPF-ALL-2")
      expect(res.data!.find((v) => v.code === "VPF-ALL-2")?.userName).toBe(fixtureUsers[2].fullName)
    })

    it("filters by vpfId", async () => {
      await issue({ code: "VPF-ALL-3" })
      await issue({ code: "VPF-ALL-4", vpfId: user2.vpfId })
      const handler = await importAdminList()
      const res = await handler(createMockH3Event({ context: { user: admin }, query: { vpfId: user2.vpfId } }))
      expect(res.data?.map((v) => v.code)).toEqual(["VPF-ALL-4"])
    })
  })
})

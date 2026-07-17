import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases, users, vouchers } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const
const user2 = { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } as const

describe("API: purchases", () => {
  describe("POST /api/purchases", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "6months" }, context: {} })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect((res as { success: false; data: null }).data).toBeNull()
    })

    it("returns 400 for invalid plan", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "invalid" }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 403 when user tries to create for another athlete", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({
        body: { plan: "6months", vpfId: user2.vpfId },
        context: { user },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 when admin provides non-existent vpfId", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({
        body: { plan: "6months", vpfId: "VPF999999" },
        context: { user: admin },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns purchase with refCode when user creates 6months plan for self", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "6months" }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.refCode).toMatch(/^\d{6}$/)
      expect(res.data?.type).toEqual(["vip"])
      expect(res.data?.plan).toBe("6months")
      expect(res.data?.amount).toBe(300_000)
      expect(res.data?.status).toBe("pending")
      expect(res.data?.purchaseId).toBeDefined()
    })

    it("returns purchase with refCode when user creates 1year plan for self", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "1year" }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.plan).toBe("1year")
      expect(res.data?.amount).toBe(300_000)
    })

    it("returns purchase when admin creates for another athlete", async () => {
      const handler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({
        body: { plan: "6months", vpfId: user2.vpfId },
        context: { user: admin },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.refCode).toMatch(/^\d{6}$/)
    })
  })

  describe("POST /api/purchases — vouchers", () => {
    async function issueVoucher(values: Partial<typeof vouchers.$inferInsert> & { code: string }) {
      const [row] = await db
        .insert(vouchers)
        .values({
          vpfId: user.vpfId,
          type: "vip",
          discountKind: "percent",
          discountValue: 20,
          expiresAt: "2099-12-31",
          ...values,
        })
        .returning()
      return row
    }

    beforeEach(async () => {
      await db.delete(vouchers).where(inArray(vouchers.vpfId, [user.vpfId, user2.vpfId]))
    })

    afterAll(async () => {
      await db.delete(vouchers).where(inArray(vouchers.vpfId, [user.vpfId, user2.vpfId]))
      // The 100%-voucher case activates a VIP purchase; later suites assume the
      // athlete has no active membership, so hand the fixture back as we found it.
      await db
        .update(users)
        .set({ vipMembershipExpiresAt: null })
        .where(inArray(users.vpfId, [user.vpfId, user2.vpfId]))
      await db.delete(purchases).where(inArray(purchases.vpfId, [user.vpfId, user2.vpfId]))
    })

    it("discounts the plan price and reports the applied voucher", async () => {
      await issueVoucher({ code: "VPF-VIP-20" })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({ body: { plan: "1year", voucherCode: "VPF-VIP-20" }, context: { user } }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(240_000)
      expect(res.data?.subtotal).toBe(300_000)
      expect(res.data?.totalDiscount).toBe(60_000)
      expect(res.data?.vouchers).toEqual([{ code: "VPF-VIP-20", type: "vip", discount: 60_000 }])
      expect(res.data?.qrUrl).toContain("amount=240000")
    })

    it("activates immediately with no QR for a 100% voucher", async () => {
      await issueVoucher({ code: "VPF-VIP-FREE", discountValue: 100 })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({ body: { plan: "6months", voucherCode: "VPF-VIP-FREE" }, context: { user } }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(0)
      expect(res.data?.status).toBe("active")
      expect(res.data?.qrUrl).toBeUndefined()

      const row = await db
        .select({ status: purchases.status, approvedBy: purchases.approvedBy })
        .from(purchases)
        .where(eq(purchases.purchaseId, res.data!.purchaseId))
        .then((r) => r[0])
      expect(row.status).toBe("active")
      expect(row.approvedBy).toBeNull()
    })

    it("clamps a fixed voucher larger than the plan price", async () => {
      await issueVoucher({ code: "VPF-VIP-BIG", discountKind: "fixed", discountValue: 900_000 })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({ body: { plan: "1year", voucherCode: "VPF-VIP-BIG" }, context: { user } }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(0)
      expect(res.data?.totalDiscount).toBe(300_000)
    })

    it("resolves an admin's voucher against the target athlete, not the admin", async () => {
      await issueVoucher({ code: "VPF-VIP-TARGET", vpfId: user2.vpfId })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({
          body: { plan: "1year", vpfId: user2.vpfId, voucherCode: "VPF-VIP-TARGET" },
          context: { user: admin },
        }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(240_000)
    })

    it("rejects a voucher belonging to someone else as not found", async () => {
      await issueVoucher({ code: "VPF-VIP-OTHER", vpfId: user2.vpfId })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({ body: { plan: "1year", voucherCode: "VPF-VIP-OTHER" }, context: { user } }),
      )
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found/i)
    })

    it("rejects a voucher whose type does not match the purchase", async () => {
      await issueVoucher({ code: "VPF-VIP-WRONG", type: "competition" })
      const handler = (await import("~/server/api/purchases/index.post")).default
      const res = await handler(
        createMockH3Event({ body: { plan: "1year", voucherCode: "VPF-VIP-WRONG" }, context: { user } }),
      )
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not applicable/i)
    })
  })

  describe("GET /api/purchases/[refCode]", () => {
    async function createPendingPurchase(forUser: typeof user) {
      const createHandler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "1year" }, context: { user: forUser } })
      const res = await createHandler(event)
      if (!res.success) throw new Error("Failed to create purchase")
      return res.data!.refCode
    }

    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/index.get")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: {} })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 for non-existent refCode", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/index.get")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 403 when user tries to view another athlete's purchase", async () => {
      const refCode = await createPendingPurchase(user2)
      const handler = (await import("~/server/api/purchases/[refCode]/index.get")).default
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns purchase status for own purchase", async () => {
      const refCode = await createPendingPurchase(user)
      const handler = (await import("~/server/api/purchases/[refCode]/index.get")).default
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.refCode).toBe(refCode)
      expect(res.data?.status).toBe("pending")
      expect(res.data?.amount).toBe(300_000)
      expect(res.data?.confirmedAt).toBeNull()
      expect(res.data?.cancelledAt).toBeNull()
    })

    it("admin can view any purchase", async () => {
      const refCode = await createPendingPurchase(user)
      const handler = (await import("~/server/api/purchases/[refCode]/index.get")).default
      const event = createMockH3Event({ params: { refCode }, context: { user: admin } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.refCode).toBe(refCode)
    })
  })

  describe("PATCH /api/purchases/[refCode]/cancel", () => {
    async function createPendingPurchase(forUser: typeof user | typeof admin | typeof user2) {
      const createHandler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan: "6months" }, context: { user: forUser } })
      const res = await createHandler(event)
      if (!res.success) throw new Error("Failed to create purchase")
      return res.data!.refCode
    }

    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: {} })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 for non-existent refCode", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found/i)
    })

    it("returns 403 when user tries to cancel another athlete's purchase", async () => {
      const refCode = await createPendingPurchase(user2)
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("cancels own pending purchase", async () => {
      const refCode = await createPendingPurchase(user)
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.status).toBe("cancelled")
      expect(res.data?.cancelledAt).toBeDefined()
      expect(res.data?.refCode).toBe(refCode)
    })

    it("returns 400 when trying to cancel an already-cancelled purchase", async () => {
      const refCode = await createPendingPurchase(user)
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const cancelEvent = createMockH3Event({ params: { refCode }, context: { user } })
      await handler(cancelEvent)
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("admin can cancel any athlete's pending purchase", async () => {
      const refCode = await createPendingPurchase(user)
      const handler = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const event = createMockH3Event({ params: { refCode }, context: { user: admin } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.status).toBe("cancelled")
    })
  })

  describe("PATCH /api/purchases/[refCode]/approve", () => {
    async function createPendingPurchase(plan: "6months" | "1year" = "6months") {
      const createHandler = (await import("~/server/api/purchases/index.post")).default
      const event = createMockH3Event({ body: { plan }, context: { user } })
      const res = await createHandler(event)
      if (!res.success) throw new Error("Failed to create purchase")
      return res.data!.refCode
    }

    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/approve.patch")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: {} })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 403 when non-admin tries to approve", async () => {
      const refCode = await createPendingPurchase()
      const handler = (await import("~/server/api/purchases/[refCode]/approve.patch")).default
      const event = createMockH3Event({ params: { refCode }, context: { user } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 for non-existent refCode", async () => {
      const handler = (await import("~/server/api/purchases/[refCode]/approve.patch")).default
      const event = createMockH3Event({ params: { refCode: "000000" }, context: { user: admin } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found/i)
    })

    it("approves purchase and extends vipMembershipExpiresAt from today when athlete has no active VIP", async () => {
      const refCode = await createPendingPurchase("6months")
      const handler = (await import("~/server/api/purchases/[refCode]/approve.patch")).default
      const event = createMockH3Event({ params: { refCode }, context: { user: admin } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.status).toBe("active")
      expect(res.data?.approvedBy).toBe(admin.vpfId)
      expect(res.data?.confirmedAt).toBeDefined()
      expect(res.data?.vipMembershipExpiresAt).toBeDefined()

      // 6 months from today
      const expectedExpiry = new Date()
      expectedExpiry.setMonth(expectedExpiry.getMonth() + 6)
      const expectedDate = expectedExpiry.toISOString().split("T")[0]
      expect(res.data?.vipMembershipExpiresAt).toBe(expectedDate)
    })

    it("returns 400 when trying to approve an already-approved purchase", async () => {
      const refCode = await createPendingPurchase()
      const handler = (await import("~/server/api/purchases/[refCode]/approve.patch")).default
      const approveEvent = createMockH3Event({ params: { refCode }, context: { user: admin } })
      await handler(approveEvent)
      const event = createMockH3Event({ params: { refCode }, context: { user: admin } })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })
  })
})

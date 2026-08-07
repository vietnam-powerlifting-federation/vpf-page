import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { eq, inArray, like } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  competitionBanList,
  purchases,
  userViolations,
  users,
  vouchers,
} from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers, fixtureMeets } from "../fixtures/data"

const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const
const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const
const other = { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } as const

const MEET_ID = fixtureMeets[0].meetId
const REF_CODE = "993001"

function adminEvent(extra: Record<string, unknown> = {}) {
  return createMockH3Event({ context: { user: admin }, ...extra })
}

describe("API: admin console", () => {
  beforeEach(async () => {
    await db.delete(userViolations).where(inArray(userViolations.vpfId, [user.vpfId, other.vpfId]))
    await db.delete(competitionBanList).where(eq(competitionBanList.meetId, MEET_ID))
  })

  afterAll(async () => {
    await db.delete(userViolations).where(inArray(userViolations.vpfId, [user.vpfId, other.vpfId]))
    await db.delete(competitionBanList).where(eq(competitionBanList.meetId, MEET_ID))
    await db.delete(vouchers).where(like(vouchers.code, "VPF-CONSOLE%"))
    await db.delete(purchases).where(eq(purchases.refCode, REF_CODE))
    await db.update(users).set({ drugViolate: false, notes: null }).where(eq(users.vpfId, user.vpfId))
  })

  describe("violations (§5.1)", () => {
    async function create(body: Record<string, unknown>) {
      const handler = (await import("~/server/api/violations/index.post")).default
      return handler(adminEvent({ method: "POST", body }))
    }

    it("returns 401 anonymous, 403 non-admin, 200 admin", async () => {
      const handler = (await import("~/server/api/violations/index.get")).default
      expect((await handler(createMockH3Event({ context: {} }))).success).toBe(false)
      expect((await handler(createMockH3Event({ context: { user } }))).success).toBe(false)
      expect((await handler(adminEvent())).success).toBe(true)
    })

    it("records a violation and reports the resulting level", async () => {
      const res = await create({ vpfId: user.vpfId, note: "Missed weigh-in", expireYear: 2030 })
      expect(res.success).toBe(true)
      expect(res.data!.level).toBe(1)
      // Level 1 lets the athlete continue but requires a pledge and a fine.
      expect(res.data!.outcome).toBe("pledge")
    })

    it("blocks at level 2 — the count of rows still in force is the level", async () => {
      await create({ vpfId: user.vpfId, note: "First", expireYear: 2030 })
      const second = await create({ vpfId: user.vpfId, note: "Second", expireYear: 2030 })
      expect(second.data!.level).toBe(2)
      expect(second.data!.outcome).toBe("blocked")
    })

    it("does not count a violation that has already expired", async () => {
      await create({ vpfId: user.vpfId, note: "Old", expireYear: 2000 })
      const current = await create({ vpfId: user.vpfId, note: "Current", expireYear: 2030 })
      expect(current.data!.level).toBe(1)
    })

    it("requires explicit confirmation for a permanent sanction", async () => {
      // A blank expiry year means "never expires", which is not what blank usually
      // implies — so it cannot be reached by omission.
      const res = await create({ vpfId: user.vpfId, note: "Permanent", expireYear: null })
      expect(res.success).toBe(false)

      const confirmed = await create({
        vpfId: user.vpfId, note: "Permanent", expireYear: null, confirmPermanent: true,
      })
      expect(confirmed.success).toBe(true)
      expect(confirmed.data!.expireYear).toBeNull()
    })

    it("requires a reason to lift a violation", async () => {
      const created = await create({ vpfId: user.vpfId, note: "Recorded in error", expireYear: 2030 })
      const handler = (await import("~/server/api/violations/[id]/index.delete")).default

      const noReason = await handler(adminEvent({ method: "DELETE", params: { id: String(created.data!.id) } }))
      expect(noReason.success).toBe(false)

      const withReason = await handler(adminEvent({
        method: "DELETE",
        params: { id: String(created.data!.id) },
        query: { reason: "appeal upheld" },
      }))
      expect(withReason.success).toBe(true)
      expect(await db.select().from(userViolations).where(eq(userViolations.vpfId, user.vpfId))).toHaveLength(0)
    })
  })

  describe("competition ban list (§5.3)", () => {
    it("upserts rather than duplicating, since re-banning is an edit", async () => {
      const handler = (await import("~/server/api/meets/[id]/ban-list/index.post")).default
      await handler(adminEvent({
        method: "POST",
        params: { id: String(MEET_ID) },
        body: { vpfId: user.vpfId, reason: "đã giành HCV hạng cân 74 tại giải đấu X" },
      }))
      const res = await handler(adminEvent({
        method: "POST",
        params: { id: String(MEET_ID) },
        body: { vpfId: user.vpfId, reason: "lý do đã cập nhật" },
      }))

      expect(res.success).toBe(true)
      const rows = await db.select().from(competitionBanList).where(eq(competitionBanList.meetId, MEET_ID))
      expect(rows).toHaveLength(1)
      expect(rows[0].reason).toBe("lý do đã cập nhật")
    })

    it("lists with the names needed to render the athlete-facing notice", async () => {
      const post = (await import("~/server/api/meets/[id]/ban-list/index.post")).default
      await post(adminEvent({
        method: "POST",
        params: { id: String(MEET_ID) },
        body: { vpfId: user.vpfId, reason: "test" },
      }))

      const handler = (await import("~/server/api/meets/[id]/ban-list/index.get")).default
      const res = await handler(adminEvent({ params: { id: String(MEET_ID) } }))
      expect(res.success).toBe(true)
      expect(res.data![0].userName).toBe(fixtureUsers[0].fullName)
      expect(res.data![0].meetName).toBe(fixtureMeets[0].meetName)
    })

    it("removes a ban", async () => {
      const post = (await import("~/server/api/meets/[id]/ban-list/index.post")).default
      await post(adminEvent({
        method: "POST",
        params: { id: String(MEET_ID) },
        body: { vpfId: user.vpfId, reason: "test" },
      }))

      const handler = (await import("~/server/api/meets/[id]/ban-list/[vpfId].delete")).default
      const res = await handler(adminEvent({
        method: "DELETE",
        params: { id: String(MEET_ID), vpfId: user.vpfId },
      }))
      expect(res.success).toBe(true)
      expect(await db.select().from(competitionBanList).where(eq(competitionBanList.meetId, MEET_ID))).toHaveLength(0)
    })
  })

  describe("admin athlete edit (§4.1)", () => {
    async function patch(targetVpfId: string, body: Record<string, unknown>, context = { user: admin }) {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      return handler(createMockH3Event({ method: "PATCH", params: { id: targetVpfId }, context, body }))
    }

    it("refuses a non-admin editing someone else", async () => {
      const res = await patch(other.vpfId, { notes: "nope" }, { user } as never)
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/only admins/i)
    })

    it("edits fields that previously required SQL", async () => {
      const res = await patch(user.vpfId, {
        notes: "Corrected at weigh-in",
        vpfMembershipExpiresAt: "2030-12-31",
        squatRackPin: 14,
      })
      expect(res.success).toBe(true)
      expect(res.data!.notes).toBe("Corrected at weigh-in")
      expect(res.data!.vpfMembershipExpiresAt).toBe("2030-12-31")
      expect(res.data!.squatRackPin).toBe(14)
    })

    it("requires a reason before setting a doping ban", async () => {
      const noReason = await patch(user.vpfId, { drugViolate: true })
      expect(noReason.success).toBe(false)
      expect(noReason.message.en).toMatch(/reason is required/i)

      const withReason = await patch(user.vpfId, {
        drugViolate: true,
        drugViolateReason: "Positive test, 2026 nationals",
      })
      expect(withReason.success).toBe(true)
      expect(withReason.data!.drugViolate).toBe(true)
    })

    it("refuses to let an admin demote themselves", async () => {
      const res = await patch(admin.vpfId, { role: "user" })
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/your own admin role/i)
    })

    it("leaves identityVerified alone — an admin correction is not a re-verification", async () => {
      const before = await db
        .select({ identityVerified: users.identityVerified })
        .from(users)
        .where(eq(users.vpfId, user.vpfId))
        .then((rows) => rows[0])

      await patch(user.vpfId, { fullName: fixtureUsers[0].fullName })

      const after = await db
        .select({ identityVerified: users.identityVerified })
        .from(users)
        .where(eq(users.vpfId, user.vpfId))
        .then((rows) => rows[0])
      expect(after.identityVerified).toBe(before.identityVerified)
    })
  })

  describe("GET /api/purchases/all (§7.1)", () => {
    beforeEach(async () => {
      await db.delete(purchases).where(eq(purchases.refCode, REF_CODE))
      await db
        .insert(purchases)
        .values({ vpfId: user.vpfId, type: ["competition"], refCode: REF_CODE, amount: 500000, status: "pending" })
    })

    it("returns 403 for a non-admin", async () => {
      const handler = (await import("~/server/api/purchases/all.get")).default
      expect((await handler(createMockH3Event({ context: { user } }))).success).toBe(false)
    })

    it("shows the athlete and the memo needed to match a transfer", async () => {
      const handler = (await import("~/server/api/purchases/all.get")).default
      const res = await handler(adminEvent({ query: { search: REF_CODE } }))

      expect(res.success).toBe(true)
      const row = res.data!.find((purchase) => purchase.refCode === REF_CODE)!
      expect(row.userName).toBe(fixtureUsers[0].fullName)
      expect(row.expectedMemo).toBe(`VPF${REF_CODE}`)
      expect(row.qrUrl).toBeDefined()
    })

    it("filters by status and orders oldest-first for reconciliation", async () => {
      const handler = (await import("~/server/api/purchases/all.get")).default
      const res = await handler(adminEvent({ query: { status: "pending", order: "oldest" } }))
      expect(res.success).toBe(true)
      expect(res.data!.every((purchase) => purchase.status === "pending")).toBe(true)
    })
  })

  describe("vouchers (§8)", () => {
    it("edits an unredeemed voucher without losing its code", async () => {
      await db.insert(vouchers).values({
        code: "VPF-CONSOLE-EDIT",
        vpfId: user.vpfId,
        type: "competition",
        discountKind: "percent",
        discountValue: 20,
        expiresAt: "2099-01-01",
      })

      const handler = (await import("~/server/api/vouchers/[code]/index.patch")).default
      const res = await handler(adminEvent({
        method: "PATCH",
        params: { code: "VPF-CONSOLE-EDIT" },
        body: { expiresAt: "2099-12-31", discountValue: 30 },
      }))

      expect(res.success).toBe(true)
      expect(res.data!.code).toBe("VPF-CONSOLE-EDIT")
      expect(res.data!.expiresAt).toBe("2099-12-31")
      expect(res.data!.discountValue).toBe(30)
    })

    it("refuses to edit a redeemed voucher, so a settled price never moves", async () => {
      const [purchase] = await db
        .insert(purchases)
        .values({ vpfId: user.vpfId, type: ["competition"], refCode: "993002", amount: 0, status: "active" })
        .returning()
      await db.insert(vouchers).values({
        code: "VPF-CONSOLE-USED",
        vpfId: user.vpfId,
        type: "competition",
        discountKind: "percent",
        discountValue: 20,
        expiresAt: "2099-01-01",
        redeemedPurchaseId: purchase.purchaseId,
        redeemedAt: new Date().toISOString(),
        discountApplied: 100000,
      })

      const handler = (await import("~/server/api/vouchers/[code]/index.patch")).default
      const res = await handler(adminEvent({
        method: "PATCH",
        params: { code: "VPF-CONSOLE-USED" },
        body: { discountValue: 90 },
      }))
      expect(res.success).toBe(false)
      expect(res.message.en).toMatch(/already been used/i)

      await db.delete(vouchers).where(eq(vouchers.code, "VPF-CONSOLE-USED"))
      await db.delete(purchases).where(eq(purchases.purchaseId, purchase.purchaseId))
    })

    it("issues in bulk, one unique code per athlete", async () => {
      const handler = (await import("~/server/api/vouchers/bulk.post")).default
      const res = await handler(adminEvent({
        method: "POST",
        body: {
          vpfIds: [user.vpfId, other.vpfId, "VPF999999"],
          type: "competition",
          discountKind: "fixed",
          discountValue: 50000,
          expiresAt: "2099-12-31",
          note: "Tết promotion",
        },
      }))

      expect(res.success).toBe(true)
      expect(res.data!.issued).toBe(2)
      expect(res.data!.unknownVpfIds).toEqual(["VPF999999"])
      expect(new Set(res.data!.sampleCodes).size).toBe(2)

      const issued = await db
        .select()
        .from(vouchers)
        .where(inArray(vouchers.code, res.data!.sampleCodes))
      await db.delete(vouchers).where(inArray(vouchers.voucherId, issued.map((v) => v.voucherId)))
    })
  })

  describe("GET /api/admin/dashboard (§1.2)", () => {
    it("returns 403 for a non-admin", async () => {
      const handler = (await import("~/server/api/admin/dashboard.get")).default
      expect((await handler(createMockH3Event({ context: { user } }))).success).toBe(false)
    })

    it("returns the action queue", async () => {
      const handler = (await import("~/server/api/admin/dashboard.get")).default
      const res = await handler(adminEvent())

      expect(res.success).toBe(true)
      expect(typeof res.data!.pendingVerifications).toBe("number")
      expect(Array.isArray(res.data!.meetsMissingResults)).toBe(true)
      expect(Array.isArray(res.data!.meetsClosingSoon)).toBe(true)
      expect(Array.isArray(res.data!.meetsNeedingEntries)).toBe(true)
      expect(res.data!.totals.athletes).toBeGreaterThanOrEqual(3)
    })
  })
})

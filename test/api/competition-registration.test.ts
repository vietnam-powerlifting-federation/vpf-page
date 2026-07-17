import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import {
  meets,
  users,
  purchases,
  userViolations,
  competitionBanList,
  competitionPurchaseMetadata,
  identityVerifications,
  vouchers,
} from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

// VPF000901: dob 1995, unverified by default. Meet systemYear 2024 => age 29 => divisions [open].
const user = { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } as const

const OPEN_MEET_ID = 9101
const OPEN_MEET_SLUG = "reg-open-meet"
const CLOSED_MEET_ID = 9102
const ENTRY_FEE = 100_000
const MEMBERSHIP_FEE = 200_000
const MEDIA_PLUS_FEE = 100_000
/** Far enough out that the suite keeps passing; voucher expiry is inclusive. */
const FUTURE_DATE = "2099-12-31"

type Fields = Record<string, string | number | boolean>

function multipartFrom(fields: Fields) {
  return Object.entries(fields).map(([name, value]) => ({ name, data: Buffer.from(String(value)) }))
}

function registerEvent(meetId: string | number, fields: Fields, ctxUser: typeof user | undefined = user) {
  return createMockH3Event({
    method: "POST",
    params: { id: String(meetId) },
    context: { user: ctxUser },
    multipart: multipartFrom(fields),
  })
}

const validMemberFields: Fields = {
  capacity: "member",
  membershipTermsAccepted: true,
  dataConsentAccepted: true,
  sex: "male",
  weightClass: 83,
  division: "open",
  mediaPlus: false,
}

async function importRegister() {
  return (await import("~/server/api/meets/[id]/register.post")).default
}
async function importEligibility() {
  return (await import("~/server/api/meets/[id]/registration.get")).default
}

/** Registration requires a submitted identity verification (admin approval is not required). */
async function seedVerification(status: "pending" | "approved" | "rejected" = "pending") {
  await db
    .insert(identityVerifications)
    .values({
      vpfId: user.vpfId,
      fullName: "Test Athlete One",
      nationality: "VN",
      dob: 1995,
      nationalId: "0123456789",
      address: "123 Test Street",
      phoneNumber: "0900000000",
      idCardFrontUrl: "https://cdn.example.com/id.png",
      status,
    })
    .onConflictDoUpdate({ target: identityVerifications.vpfId, set: { status, dob: 1995 } })
}

async function resetAthleteState() {
  await db.delete(purchases).where(eq(purchases.vpfId, user.vpfId))
  await db.delete(userViolations).where(eq(userViolations.vpfId, user.vpfId))
  await db.delete(competitionBanList).where(eq(competitionBanList.vpfId, user.vpfId))
  await db
    .update(users)
    .set({ vpfMembershipExpiresAt: null, identityVerified: false, drugViolate: false })
    .where(eq(users.vpfId, user.vpfId))
  await seedVerification("pending")
}

describe("API: competition registration", () => {
  beforeAll(async () => {
    await db
      .insert(meets)
      .values([
        {
          meetId: OPEN_MEET_ID,
          meetName: "Reg Open Meet",
          meetSlug: OPEN_MEET_SLUG,
          systemYear: 2024,
          hidden: false,
          startRegistration: null,
          closeRegistration: null,
          allowGuestRegistration: true,
          entryFee: ENTRY_FEE,
        },
        {
          meetId: CLOSED_MEET_ID,
          meetName: "Reg Closed Meet",
          meetSlug: "reg-closed-meet",
          systemYear: 2024,
          hidden: false,
          startRegistration: "2020-01-01",
          closeRegistration: "2020-02-01",
          allowGuestRegistration: true,
          entryFee: ENTRY_FEE,
        },
      ] as unknown as typeof meets.$inferInsert[])
      .onConflictDoNothing({ target: meets.meetId })
    await resetAthleteState()
  })

  afterAll(async () => {
    await resetAthleteState()
    await db.delete(identityVerifications).where(eq(identityVerifications.vpfId, user.vpfId))
    await db.delete(meets).where(inArray(meets.meetId, [OPEN_MEET_ID, CLOSED_MEET_ID]))
  })

  describe("GET /api/meets/[id]/registration", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = await importEligibility()
      const res = await handler(createMockH3Event({ params: { id: OPEN_MEET_SLUG }, context: { user: undefined } }))
      expect(res.success).toBe(false)
    })

    it("returns 404 for a hidden meet", async () => {
      const handler = await importEligibility()
      const res = await handler(createMockH3Event({ params: { id: "hidden-meet" }, context: { user } }))
      expect(res.success).toBe(false)
    })

    it("returns eligibility for an open meet", async () => {
      const handler = await importEligibility()
      const res = await handler(createMockH3Event({ params: { id: OPEN_MEET_SLUG }, context: { user } }))
      expect(res.success).toBe(true)
      expect(res.data?.registrationOpen).toBe(true)
      expect(res.data?.identityVerified).toBe(false)
      expect(res.data?.identityStatus).toBe("pending")
      expect(res.data?.bans).toBeNull()
      expect(res.data?.options.divisions).toContain("open")
      expect(res.data?.options.divisions).not.toContain("jr")
      expect(res.data?.fees.entryFee).toBe(ENTRY_FEE)
      expect(res.data?.athlete.membershipOwed).toBe(true)
      expect(res.data?.alreadyRegistered).toBe(false)
    })
  })

  describe("POST /api/meets/[id]/register — guards", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = await importRegister()
      const res = await handler(
        createMockH3Event({
          method: "POST",
          params: { id: OPEN_MEET_SLUG },
          context: { user: undefined },
          multipart: multipartFrom(validMemberFields),
        }),
      )
      expect(res.success).toBe(false)
    })

    it("returns 404 for an unknown meet", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent("no-such-meet", validMemberFields))
      expect(res.success).toBe(false)
    })

    it("returns 400 when registration is closed", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(CLOSED_MEET_ID, validMemberFields))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not open/i)
    })

    it("returns 403 when identity verification has not been submitted", async () => {
      await db.delete(identityVerifications).where(eq(identityVerifications.vpfId, user.vpfId))
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, validMemberFields))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/identity verification/i)
      await seedVerification("pending")
    })

    it("returns 400 when data consent is missing", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, dataConsentAccepted: false }))
      expect(res.success).toBe(false)
    })

    it("returns 400 when a member does not accept membership terms", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, membershipTermsAccepted: false }))
      expect(res.success).toBe(false)
    })

    it("returns 400 for a weight class invalid for the chosen gender", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, weightClass: 43 }))
      expect(res.success).toBe(false)
    })

    it("returns 400 for an age division invalid for the athlete's age", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, division: "jr" }))
      expect(res.success).toBe(false)
    })
  })

  describe("POST /api/meets/[id]/register — happy paths", () => {
    it("creates a combined competition + membership purchase for a member", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, validMemberFields))
      expect(res.success).toBe(true)
      expect(res.data?.type).toEqual(expect.arrayContaining(["competition", "vpf_membership"]))
      expect(res.data?.type).toHaveLength(2)
      expect(res.data?.amount).toBe(ENTRY_FEE + MEMBERSHIP_FEE)
      expect(res.data?.identityVerified).toBe(false)
      expect(res.data?.refCode).toMatch(/^\d{6}$/)
      expect(res.data?.breakdown).toEqual({
        entryFee: ENTRY_FEE,
        membershipFee: MEMBERSHIP_FEE,
        mediaPlusFee: 0,
        totalDiscount: 0,
        discounts: [],
      })
      expect(res.data?.status).toBe("pending")
      expect(res.data?.qrUrl).toBeDefined()
    })

    it("rejects a duplicate registration with 409", async () => {
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, validMemberFields))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/already registered/i)
    })

    it("registers a guest lifter with a guest division and no membership fee", async () => {
      await db.delete(purchases).where(eq(purchases.vpfId, user.vpfId))
      const handler = await importRegister()
      const res = await handler(
        registerEvent(OPEN_MEET_SLUG, {
          capacity: "guest",
          dataConsentAccepted: true,
          sex: "male",
          weightClass: 83,
          division: "open", // ignored for guests
          mediaPlus: true,
        }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.type).toEqual(["competition"])
      expect(res.data?.amount).toBe(ENTRY_FEE + 100_000) // entry + media plus; no membership for guests

      const meta = await db
        .select({ division: competitionPurchaseMetadata.division, mediaPlus: competitionPurchaseMetadata.mediaPlus })
        .from(competitionPurchaseMetadata)
        .where(eq(competitionPurchaseMetadata.purchaseId, res.data!.purchaseId))
        .then((rows) => rows[0])
      expect(meta?.division).toBe("guest")
      expect(meta?.mediaPlus).toBe(true)
    })
  })

  describe("POST /api/meets/[id]/register — vouchers", () => {
    /** Issue a voucher directly; the admin endpoint has its own coverage in vouchers.test.ts. */
    async function issue(values: Partial<typeof vouchers.$inferInsert> & { code: string }) {
      const [row] = await db
        .insert(vouchers)
        .values({
          vpfId: user.vpfId,
          type: "competition",
          discountKind: "percent",
          discountValue: 50,
          expiresAt: FUTURE_DATE,
          ...values,
        })
        .returning()
      return row
    }

    beforeEach(async () => {
      await db.delete(purchases).where(eq(purchases.vpfId, user.vpfId))
      await db.delete(vouchers).where(eq(vouchers.vpfId, user.vpfId))
    })

    afterAll(async () => {
      await db.delete(vouchers).where(eq(vouchers.vpfId, user.vpfId))
      await resetAthleteState()
    })

    it("discounts only the entry fee, leaving membership and media plus whole", async () => {
      await issue({ code: "VPF-TEST-COMP", type: "competition", discountKind: "percent", discountValue: 50 })
      const handler = await importRegister()
      const res = await handler(
        registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, mediaPlus: true, voucherCodes: "VPF-TEST-COMP" }),
      )
      expect(res.success).toBe(true)
      // 50% off the 100k entry fee only; membership and media plus are untouched.
      expect(res.data?.amount).toBe(ENTRY_FEE / 2 + MEMBERSHIP_FEE + MEDIA_PLUS_FEE)
      expect(res.data?.breakdown.totalDiscount).toBe(ENTRY_FEE / 2)
      expect(res.data?.breakdown.discounts).toEqual([
        { code: "VPF-TEST-COMP", type: "competition", discount: ENTRY_FEE / 2 },
      ])
    })

    it("marks the voucher redeemed against the purchase and freezes the discount", async () => {
      const issued = await issue({ code: "VPF-TEST-REDEEM" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-REDEEM" }))
      expect(res.success).toBe(true)

      const row = await db
        .select()
        .from(vouchers)
        .where(eq(vouchers.voucherId, issued.voucherId))
        .then((r) => r[0])
      expect(row.redeemedPurchaseId).toBe(res.data?.purchaseId)
      expect(row.discountApplied).toBe(ENTRY_FEE / 2)
      expect(row.redeemedAt).not.toBeNull()
    })

    it("applies one voucher per type across a combined purchase", async () => {
      await issue({ code: "VPF-TEST-C2", type: "competition", discountKind: "fixed", discountValue: 40_000 })
      await issue({ code: "VPF-TEST-M2", type: "vpf_membership", discountKind: "percent", discountValue: 25 })
      const handler = await importRegister()
      const res = await handler(
        registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-C2,VPF-TEST-M2" }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(ENTRY_FEE - 40_000 + MEMBERSHIP_FEE * 0.75)
      expect(res.data?.breakdown.totalDiscount).toBe(40_000 + MEMBERSHIP_FEE * 0.25)
    })

    it("activates immediately with no QR when vouchers cover the whole amount", async () => {
      await issue({ code: "VPF-TEST-FREE1", type: "competition", discountKind: "percent", discountValue: 100 })
      await issue({ code: "VPF-TEST-FREE2", type: "vpf_membership", discountKind: "percent", discountValue: 100 })
      const handler = await importRegister()
      const res = await handler(
        registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-FREE1,VPF-TEST-FREE2" }),
      )
      expect(res.success).toBe(true)
      expect(res.data?.amount).toBe(0)
      expect(res.data?.status).toBe("active")
      expect(res.data?.qrUrl).toBeUndefined()

      // Activation must run through approvePurchase, so membership expiry is extended.
      const row = await db
        .select({ status: purchases.status, approvedBy: purchases.approvedBy })
        .from(purchases)
        .where(eq(purchases.purchaseId, res.data!.purchaseId))
        .then((r) => r[0])
      expect(row.status).toBe("active")
      expect(row.approvedBy).toBeNull()

      const account = await db
        .select({ expiry: users.vpfMembershipExpiresAt })
        .from(users)
        .where(eq(users.vpfId, user.vpfId))
        .then((r) => r[0])
      expect(account.expiry).toBe("2024-12-31")
      await db.update(users).set({ vpfMembershipExpiresAt: null }).where(eq(users.vpfId, user.vpfId))
    })

    it("rejects a voucher owned by another athlete as not found", async () => {
      await issue({ code: "VPF-TEST-OTHER", vpfId: fixtureUsers[2].vpfId })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-OTHER" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found/i)
      await db.delete(vouchers).where(eq(vouchers.vpfId, fixtureUsers[2].vpfId))
    })

    it("rejects an expired voucher", async () => {
      await issue({ code: "VPF-TEST-EXP", expiresAt: "2020-01-01" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-EXP" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/expired/i)
    })

    it("rejects a voucher for a type this purchase does not cover", async () => {
      await issue({ code: "VPF-TEST-VIP", type: "vip" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-VIP" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not applicable/i)
    })

    it("rejects two vouchers of the same type in one request", async () => {
      await issue({ code: "VPF-TEST-DUP1", type: "competition" })
      await issue({ code: "VPF-TEST-DUP2", type: "competition" })
      const handler = await importRegister()
      const res = await handler(
        registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-DUP1,VPF-TEST-DUP2" }),
      )
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/one voucher per item/i)
    })

    it("rejects an already-redeemed voucher", async () => {
      await issue({ code: "VPF-TEST-ONCE" })
      const handler = await importRegister()
      const first = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-ONCE" }))
      expect(first.success).toBe(true)

      // Clear the duplicate-registration gate so the voucher check is what fails.
      // Cancelled directly rather than through the endpoint, which would release the voucher.
      await db
        .update(purchases)
        .set({ status: "cancelled" })
        .where(eq(purchases.purchaseId, first.data!.purchaseId))
      const second = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-ONCE" }))
      expect(second.success).toBe(false)
      expect(second.message?.en).toMatch(/already been used/i)
    })

    it("rejects a membership voucher when membership is not owed", async () => {
      await db
        .update(users)
        .set({ vpfMembershipExpiresAt: "2024-12-31" })
        .where(eq(users.vpfId, user.vpfId))
      await issue({ code: "VPF-TEST-NOOWE", type: "vpf_membership" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-NOOWE" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not applicable/i)
      await db.update(users).set({ vpfMembershipExpiresAt: null }).where(eq(users.vpfId, user.vpfId))
    })

    it("releases the voucher when the purchase is cancelled", async () => {
      const issued = await issue({ code: "VPF-TEST-REL" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, { ...validMemberFields, voucherCodes: "VPF-TEST-REL" }))
      expect(res.success).toBe(true)

      const cancel = (await import("~/server/api/purchases/[refCode]/cancel.patch")).default
      const cancelled = await cancel(
        createMockH3Event({ method: "PATCH", params: { refCode: res.data!.refCode }, context: { user } }),
      )
      expect(cancelled.success).toBe(true)

      const row = await db
        .select()
        .from(vouchers)
        .where(eq(vouchers.voucherId, issued.voucherId))
        .then((r) => r[0])
      expect(row.redeemedPurchaseId).toBeNull()
      expect(row.redeemedAt).toBeNull()
      expect(row.discountApplied).toBeNull()
    })
  })

  describe("POST /api/meets/[id]/register — ban gates (verified athletes)", () => {
    beforeAll(async () => {
      await db.delete(purchases).where(eq(purchases.vpfId, user.vpfId))
      await db.update(users).set({ identityVerified: true }).where(eq(users.vpfId, user.vpfId))
    })
    afterAll(async () => {
      await resetAthleteState()
    })

    it("blocks an athlete with two active violations (level 2)", async () => {
      await db.delete(userViolations).where(eq(userViolations.vpfId, user.vpfId))
      await db.insert(userViolations).values([
        { vpfId: user.vpfId, expireYear: 2024, note: "v1" },
        { vpfId: user.vpfId, expireYear: 2025, note: "v2" },
      ])
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, validMemberFields))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/violation/i)
      await db.delete(userViolations).where(eq(userViolations.vpfId, user.vpfId))
    })

    it("blocks an athlete on the competition ban list and surfaces the reason", async () => {
      await db.insert(competitionBanList).values({ meetId: OPEN_MEET_ID, vpfId: user.vpfId, reason: "đã giành HCV" })
      const handler = await importRegister()
      const res = await handler(registerEvent(OPEN_MEET_SLUG, validMemberFields))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/đã giành HCV/)
      await db.delete(competitionBanList).where(eq(competitionBanList.vpfId, user.vpfId))
    })
  })
})

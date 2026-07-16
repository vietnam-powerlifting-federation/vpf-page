import { describe, it, expect, beforeAll, afterAll } from "vitest"
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
      expect(res.data?.breakdown).toEqual({ entryFee: ENTRY_FEE, membershipFee: MEMBERSHIP_FEE, mediaPlusFee: 0 })
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

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, identityVerifications } from "~/lib/external/drizzle/migrations/schema"

const TEMP_VPF_ID = "VPF000991"
const TEMP_EMAIL = "verify-temp@test.vpf"
const admin = fixtureUsers[1] // role: admin

function future(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString()
}
function past(): string {
  return new Date(Date.now() - 60 * 1000).toISOString()
}

async function resetTempUser(fields: Partial<typeof users.$inferInsert>): Promise<void> {
  await db
    .insert(users)
    .values({
      vpfId: TEMP_VPF_ID,
      fullName: "Temp Verify User",
      email: TEMP_EMAIL,
      role: "user",
      emailVerified: false,
      ...fields,
    })
    .onConflictDoUpdate({
      target: users.vpfId,
      set: { emailVerified: false, identityVerified: false, emailVerificationCode: null, emailVerificationExpiresAt: null, ...fields },
    })
}

beforeAll(async () => {
  await resetTempUser({})
})

afterAll(async () => {
  // Cascade removes any identity_verifications rows for the temp user.
  await db.delete(users).where(eq(users.vpfId, TEMP_VPF_ID))
})

const tempCtx = { user: { vpfId: TEMP_VPF_ID, email: TEMP_EMAIL, role: "user" as const } }

describe("API: POST /api/auth/verify-email", () => {
  it("returns 401 when not authenticated", async () => {
    const handler = (await import("~/server/api/auth/verify-email.post")).default
    const event = createMockH3Event({ method: "POST", body: { code: "123456" }, context: { user: undefined } })
    const res = await handler(event)
    expect(res.success).toBe(false)
  })

  it("returns 400 when code is missing", async () => {
    const handler = (await import("~/server/api/auth/verify-email.post")).default
    const event = createMockH3Event({ method: "POST", body: {}, context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
  })

  it("returns 400 for a wrong code", async () => {
    await resetTempUser({ emailVerificationCode: "123456", emailVerificationExpiresAt: future() })
    const handler = (await import("~/server/api/auth/verify-email.post")).default
    const event = createMockH3Event({ method: "POST", body: { code: "000000" }, context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
    expect(res.message?.en).toMatch(/Invalid/)
  })

  it("returns 400 for an expired code", async () => {
    await resetTempUser({ emailVerificationCode: "123456", emailVerificationExpiresAt: past() })
    const handler = (await import("~/server/api/auth/verify-email.post")).default
    const event = createMockH3Event({ method: "POST", body: { code: "123456" }, context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
    expect(res.message?.en).toMatch(/expired/)
  })

  it("verifies email with the correct code", async () => {
    await resetTempUser({ emailVerificationCode: "654321", emailVerificationExpiresAt: future() })
    const handler = (await import("~/server/api/auth/verify-email.post")).default
    const event = createMockH3Event({ method: "POST", body: { code: "654321" }, context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.emailVerified).toBe(true)

    const row = await db.select({ v: users.emailVerified, c: users.emailVerificationCode }).from(users).where(eq(users.vpfId, TEMP_VPF_ID)).then((r) => r[0])
    expect(row?.v).toBe(true)
    expect(row?.c).toBeNull()
  })
})

describe("API: GET /api/verifications/self", () => {
  it("returns 401 when not authenticated", async () => {
    const handler = (await import("~/server/api/verifications/self.get")).default
    const event = createMockH3Event({ context: { user: undefined } })
    const res = await handler(event)
    expect(res.success).toBe(false)
  })

  it("returns email-verified status and null verification for a new user", async () => {
    await resetTempUser({ emailVerified: true })
    const handler = (await import("~/server/api/verifications/self.get")).default
    const event = createMockH3Event({ context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.emailVerified).toBe(true)
    expect(res.data?.identityVerified).toBe(false)
    expect(res.data?.verification).toBeNull()
  })
})

describe("API: POST /api/verifications/self", () => {
  it("returns 403 when email is not verified", async () => {
    await resetTempUser({ emailVerified: false })
    const handler = (await import("~/server/api/verifications/self.post")).default
    const event = createMockH3Event({ method: "POST", context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
    expect(res.message?.en).toMatch(/verify your email/)
  })
})

describe("API: GET /api/verifications (admin list)", () => {
  it("returns 403 for a non-admin", async () => {
    const handler = (await import("~/server/api/verifications/index.get")).default
    const event = createMockH3Event({ context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
  })

  it("returns an array for an admin", async () => {
    const handler = (await import("~/server/api/verifications/index.get")).default
    const event = createMockH3Event({
      context: { user: { vpfId: admin.vpfId, email: admin.email, role: "admin" } },
    })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(Array.isArray(res.data)).toBe(true)
  })
})

describe("API: PATCH /api/verifications/[id]/review", () => {
  async function seedVerification(): Promise<number> {
    await resetTempUser({ emailVerified: true })
    const row = await db
      .insert(identityVerifications)
      .values({
        vpfId: TEMP_VPF_ID,
        fullName: "Verified Name",
        nationality: "VN",
        dob: 1998,
        nationalId: "0123456789",
        address: "123 Test Street",
        phoneNumber: "0900000000",
        idCardFrontUrl: "https://cdn.example.com/id.png",
        status: "pending",
      })
      .onConflictDoUpdate({
        target: identityVerifications.vpfId,
        set: { status: "pending", reviewedBy: null, reviewedAt: null, fullName: "Verified Name", nationality: "VN", dob: 1998 },
      })
      .returning({ id: identityVerifications.id })
      .then((r) => r[0])
    return row!.id
  }

  it("returns 403 for a non-admin", async () => {
    const id = await seedVerification()
    const handler = (await import("~/server/api/verifications/[id]/review.patch")).default
    const event = createMockH3Event({ method: "PATCH", params: { id: String(id) }, body: { decision: "approved" }, context: tempCtx })
    const res = await handler(event)
    expect(res.success).toBe(false)
  })

  it("approves and copies data onto the user record", async () => {
    const id = await seedVerification()
    const handler = (await import("~/server/api/verifications/[id]/review.patch")).default
    const event = createMockH3Event({
      method: "PATCH",
      params: { id: String(id) },
      body: { decision: "approved" },
      context: { user: { vpfId: admin.vpfId, email: admin.email, role: "admin" } },
    })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.status).toBe("approved")
    expect(res.data?.reviewedBy).toBe(admin.vpfId)
    expect(res.data?.reviewedAt).toBeTruthy()

    const user = await db.select({ nationality: users.nationality, dob: users.dob, fullName: users.fullName, identityVerified: users.identityVerified }).from(users).where(eq(users.vpfId, TEMP_VPF_ID)).then((r) => r[0])
    expect(user?.nationality).toBe("VN")
    expect(user?.dob).toBe(1998)
    expect(user?.fullName).toBe("Verified Name")
    expect(user?.identityVerified).toBe(true)
  })

  it("rejects with a review note and clears the identityVerified flag", async () => {
    const id = await seedVerification()
    // Simulate a previously-approved account so we can prove rejection clears the flag.
    await db.update(users).set({ identityVerified: true }).where(eq(users.vpfId, TEMP_VPF_ID))
    const handler = (await import("~/server/api/verifications/[id]/review.patch")).default
    const event = createMockH3Event({
      method: "PATCH",
      params: { id: String(id) },
      body: { decision: "rejected", reviewNote: "Blurry photo" },
      context: { user: { vpfId: admin.vpfId, email: admin.email, role: "admin" } },
    })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.status).toBe("rejected")
    expect(res.data?.reviewNote).toBe("Blurry photo")

    const user = await db.select({ identityVerified: users.identityVerified }).from(users).where(eq(users.vpfId, TEMP_VPF_ID)).then((r) => r[0])
    expect(user?.identityVerified).toBe(false)
  })
})

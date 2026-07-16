import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"

const RESET_VPF_ID = "VPF000992"
const RESET_EMAIL = "reset-temp@test.vpf"
const RESET_CODE = "123456"

function future(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString()
}
function past(): string {
  return new Date(Date.now() - 60 * 1000).toISOString()
}

/** Recreate the reset-flow user so each test starts from a known reset-code state. */
async function resetTempUser(fields: Partial<typeof users.$inferInsert> = {}): Promise<void> {
  const base = {
    fullName: "Temp Reset User",
    email: RESET_EMAIL,
    role: "user" as const,
    password: await bcrypt.hash("oldpassword123", 4),
    passwordResetCode: null,
    passwordResetExpiresAt: null,
    ...fields,
  }
  await db
    .insert(users)
    .values({ vpfId: RESET_VPF_ID, ...base })
    .onConflictDoUpdate({ target: users.vpfId, set: base })
}

function resetFields() {
  return db
    .select({ code: users.passwordResetCode, expiresAt: users.passwordResetExpiresAt, password: users.password })
    .from(users)
    .where(eq(users.vpfId, RESET_VPF_ID))
    .then((rows) => rows[0])
}

describe("API: auth", () => {
  describe("POST /api/auth/login", () => {
    it("returns 400 when password is missing", async () => {
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({ body: { email: "athlete1@test.vpf" }, method: "POST" })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toContain("Password")
    })

    it("returns 400 when neither vpfId nor email provided", async () => {
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({ body: { password: "x" }, method: "POST" })
      const res = await handler(event)
      expect(res.success).toBe(false)
      if (res.message?.en) expect(res.message.en).toMatch(/credentials|Invalid/)
    })

    it("returns 401 for wrong password", async () => {
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({
        body: { email: fixtureUsers[0].email, password: "wrong" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/credentials|Invalid/)
    })

    it("returns 200 and token when credentials are valid (email)", async () => {
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({
        body: { email: fixtureUsers[0].email, password: fixtureUsers[0].password },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.user?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.token).toBeDefined()
      expect(typeof res.data?.token).toBe("string")
      expect(res.message?.en).toMatch(/success|Login/)
    })

    it("returns 200 when logging in with vpfId", async () => {
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({
        body: { vpfId: fixtureUsers[0].vpfId, password: fixtureUsers[0].password },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.user?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.token).toBeDefined()
    })

    it("returns the account's emailVerified status so the client can gate unverified logins", async () => {
      await resetTempUser({ emailVerified: true })
      const handler = (await import("~/server/api/auth/login.post")).default
      const event = createMockH3Event({
        body: { email: RESET_EMAIL, password: "oldpassword123" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.emailVerified).toBe(true)
    })
  })

  describe("POST /api/auth/register", () => {
    it("returns 400 when email is missing", async () => {
      const handler = (await import("~/server/api/auth/register.post")).default
      const event = createMockH3Event({
        body: { password: "pass", fullName: "Test" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Email|required/)
    })

    it("returns 400 when password is missing", async () => {
      const handler = (await import("~/server/api/auth/register.post")).default
      const event = createMockH3Event({
        body: { email: "new@test.vpf", fullName: "New User" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Password|required/)
    })

    it("returns 400 for invalid email format", async () => {
      const handler = (await import("~/server/api/auth/register.post")).default
      const event = createMockH3Event({
        body: { email: "not-an-email", password: "pass123", fullName: "Test" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/email|format|Invalid/)
    })

    it("returns 409 when email already exists", async () => {
      const handler = (await import("~/server/api/auth/register.post")).default
      const event = createMockH3Event({
        body: {
          email: fixtureUsers[0].email,
          password: "otherpass",
          fullName: "Other",
        },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/exists|already/)
    })

    it("returns 200 and user when registration succeeds", async () => {
      const handler = (await import("~/server/api/auth/register.post")).default
      const email = `newuser-${Date.now()}@test.vpf`
      const event = createMockH3Event({
        body: { email, password: "secure123", fullName: "New User" },
        method: "POST",
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.user?.vpfId).toBeDefined()
      expect(res.data?.user?.fullName).toBe("New User")
      expect(res.data?.token).toBeDefined()
      expect(res.data?.emailVerified).toBe(false)
      expect(res.message?.en).toMatch(/success|Registration/)
    })
  })

  describe("POST /api/auth/forgot-password", () => {
    beforeEach(async () => {
      await resetTempUser()
    })

    afterAll(async () => {
      await db.delete(users).where(eq(users.vpfId, RESET_VPF_ID))
    })

    it("returns 400 for an invalid email", async () => {
      const handler = (await import("~/server/api/auth/forgot-password.post")).default
      const event = createMockH3Event({ method: "POST", body: { email: "not-an-email" } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid/)
    })

    it("stores a reset code when the email is registered", async () => {
      const handler = (await import("~/server/api/auth/forgot-password.post")).default
      const event = createMockH3Event({ method: "POST", body: { email: RESET_EMAIL } })
      const res = await handler(event)
      expect(res.success).toBe(true)

      const row = await resetFields()
      expect(row?.code).toMatch(/^\d{6}$/)
      expect(row?.expiresAt).toBeTruthy()
      expect(new Date(row!.expiresAt!).getTime()).toBeGreaterThan(Date.now())
    })

    it("succeeds without storing a code when the email is unknown", async () => {
      const handler = (await import("~/server/api/auth/forgot-password.post")).default
      const event = createMockH3Event({ method: "POST", body: { email: "nobody@test.vpf" } })
      const res = await handler(event)

      // Same response as the registered case, so the endpoint cannot be used to probe emails.
      expect(res.success).toBe(true)
      const row = await resetFields()
      expect(row?.code).toBeNull()
    })
  })

  describe("POST /api/auth/reset-password", () => {
    afterAll(async () => {
      await db.delete(users).where(eq(users.vpfId, RESET_VPF_ID))
    })

    it("returns 400 when the new password is too short", async () => {
      await resetTempUser({ passwordResetCode: RESET_CODE, passwordResetExpiresAt: future() })
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const event = createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, code: RESET_CODE, password: "short" },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid/)
    })

    it("returns 400 for a wrong code", async () => {
      await resetTempUser({ passwordResetCode: RESET_CODE, passwordResetExpiresAt: future() })
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const event = createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, code: "999999", password: "newpassword123" },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid or expired/)
    })

    it("returns 400 for an expired code", async () => {
      await resetTempUser({ passwordResetCode: RESET_CODE, passwordResetExpiresAt: past() })
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const event = createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, code: RESET_CODE, password: "newpassword123" },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid or expired/)
    })

    it("returns 400 when no reset was requested", async () => {
      await resetTempUser()
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const event = createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, code: RESET_CODE, password: "newpassword123" },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid or expired/)
    })

    it("sets the new password, clears the code, and allows login with it", async () => {
      await resetTempUser({ passwordResetCode: RESET_CODE, passwordResetExpiresAt: future() })
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const event = createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, code: RESET_CODE, password: "newpassword123" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.message?.en).toMatch(/success/i)

      const row = await resetFields()
      expect(row?.code).toBeNull()
      expect(row?.expiresAt).toBeNull()
      expect(await bcrypt.compare("newpassword123", row!.password!)).toBe(true)

      const login = (await import("~/server/api/auth/login.post")).default
      const loginRes = await login(createMockH3Event({
        method: "POST",
        body: { email: RESET_EMAIL, password: "newpassword123" },
      }))
      expect(loginRes.success).toBe(true)
    })

    it("rejects reuse of a code that was already consumed", async () => {
      await resetTempUser({ passwordResetCode: RESET_CODE, passwordResetExpiresAt: future() })
      const handler = (await import("~/server/api/auth/reset-password.post")).default
      const body = { email: RESET_EMAIL, code: RESET_CODE, password: "newpassword123" }

      const first = await handler(createMockH3Event({ method: "POST", body }))
      expect(first.success).toBe(true)

      const second = await handler(createMockH3Event({
        method: "POST",
        body: { ...body, password: "anotherpassword123" },
      }))
      expect(second.success).toBe(false)
      expect(second.message?.en).toMatch(/Invalid or expired/)
    })
  })
})

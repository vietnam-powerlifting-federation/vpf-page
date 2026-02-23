import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

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
      expect(res.data?.vpfId).toBeDefined()
      expect(res.data?.fullName).toBe("New User")
      expect(res.message?.en).toMatch(/success|Registration/)
    })
  })
})

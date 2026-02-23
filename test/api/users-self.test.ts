import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: users/self", () => {
  describe("GET /api/users/self", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/users/self/index")).default
      const event = createMockH3Event({ context: { user: undefined } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 200 and current user profile when authenticated", async () => {
      const handler = (await import("~/server/api/users/self/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.fullName).toBe(fixtureUsers[0].fullName)
      expect(res.data?.email).toBe(fixtureUsers[0].email)
    })
  })

  describe("PATCH /api/users/self", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/users/self/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        body: { nationality: "US" },
        context: { user: undefined },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 400 for invalid patch data", async () => {
      const handler = (await import("~/server/api/users/self/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        body: { email: "not-an-email" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|Required|đầu vào/)
    })

    it("returns 200 and updated profile when patch is valid", async () => {
      const handler = (await import("~/server/api/users/self/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        body: { nationality: "US" },
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data?.nationality).toBe("US")
    })
  })
})

import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: athletes/[id] with id=self", () => {
  describe("GET /api/athletes/self", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({ params: { id: "self" }, context: { user: undefined } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 200 and current athlete profile when authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "self" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.athlete?.fullName).toBe(fixtureUsers[0].fullName)
      expect((res.data?.athlete as { email?: string })?.email).toBe(fixtureUsers[0].email)
    })
  })

  describe("PATCH /api/athletes/self", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body: { nationality: "US" },
        context: { user: undefined },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 403 when a non-admin patches an id other than self", async () => {
      // The endpoint serves both self-service and admin edits (admin tools spec
      // §4.1), so any id but "self" now falls to the admin branch and is refused
      // unless the caller actually is one.
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: fixtureUsers[0].vpfId },
        body: { nationality: "US" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Only admins|Chỉ quản trị viên/)
    })

    it("returns 400 for invalid patch data", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body: { email: "not-an-email" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|Required|đầu vào/)
    })

    it("returns 200 and updated profile when patch is valid", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
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

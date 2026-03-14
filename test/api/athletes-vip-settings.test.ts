import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: athletes/[id]/vip-settings", () => {
  describe("PATCH /api/athletes/[id]/vip-settings", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body: { profileDescription: "Test" },
        context: { user: undefined },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 403 when id is another user and requester is not admin", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: fixtureUsers[2].vpfId },
        body: { profileDescription: "Other" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/only update your own|admin/)
    })

    it("returns 200 and creates VIP settings when id=self and valid JSON body", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body: {
          profileDescription: "Test profile",
          displayProfileDescription: true,
          alias: "TestAlias",
          displayAlias: true,
        },
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data!.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data!.profileDescription).toBe("Test profile")
      expect(res.data!.displayProfileDescription).toBe(true)
      expect(res.data!.alias).toBe("TestAlias")
      expect(res.data!.displayAlias).toBe(true)
    })

    it("returns 200 when id is requester's vpfId", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: fixtureUsers[2].vpfId },
        body: {
          profileDescription: "Updated description",
          displayProfileDescription: false,
        },
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data!.profileDescription).toBe("Updated description")
      expect(res.data!.displayProfileDescription).toBe(false)
    })

    it("returns 200 when admin patches another athlete's VIP settings", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: fixtureUsers[0].vpfId },
        body: { alias: "AdminSetAlias", displayAlias: true },
        context: { user: { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data!.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data!.alias).toBe("AdminSetAlias")
      expect(res.data!.displayAlias).toBe(true)
    })

    it("returns 400 when body is invalid", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body: { displayProfileDescription: "not-a-boolean" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|không hợp lệ/)
    })
  })
})

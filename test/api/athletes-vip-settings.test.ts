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

  describe("PATCH decorator validation", () => {
    function patchDecorators(body: Record<string, unknown>) {
      return createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        body,
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
    }

    it("accepts #RRGGBB decorators", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchDecorators({ decorator1: "#FF0000", decorator2: "#00ff00" }))
      expect(res.success).toBe(true)
      expect(res.data!.decorator1).toBe("#FF0000")
      expect(res.data!.decorator2).toBe("#00ff00")
    })

    it("accepts null decorators so the athlete can reset to the default name colour", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchDecorators({ decorator1: null, decorator2: null }))
      expect(res.success).toBe(true)
      expect(res.data!.decorator1).toBeNull()
      expect(res.data!.decorator2).toBeNull()
    })

    it("rejects a CSS url() decorator that would leak every profile visitor's IP", async () => {
      // Decorators render into a style attribute on public leaderboards and profiles, so an
      // unconstrained value would make every visitor call an attacker-controlled host.
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchDecorators({ decorator1: "url(https://attacker.example/p.png)" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|không hợp lệ/)
    })

    it("rejects a named CSS colour", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchDecorators({ decorator1: "red" }))
      expect(res.success).toBe(false)
    })

    it("rejects 3-digit shorthand hex", async () => {
      // ColorPicker format="hex" always emits 6 digits, so the strict regex loses nothing.
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchDecorators({ decorator1: "#fff" }))
      expect(res.success).toBe(false)
    })
  })

  describe("PATCH multipart text fields", () => {
    // No file parts in these — uploadVipImage needs live R2 credentials.
    function patchMultipart(fields: Record<string, string>) {
      return createMockH3Event({
        method: "PATCH",
        params: { id: "self" },
        multipart: Object.entries(fields).map(([name, value]) => ({ name, data: Buffer.from(value) })),
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
    }

    it("rejects an invalid decorator instead of silently dropping the whole patch", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchMultipart({ decorator1: "javascript:alert(1)" }))
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|không hợp lệ/)
    })

    it("coerces an empty decorator to null rather than failing the hex check", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchMultipart({ decorator1: "", alias: "MultipartAlias" }))
      expect(res.success).toBe(true)
      expect(res.data!.decorator1).toBeNull()
      expect(res.data!.alias).toBe("MultipartAlias")
    })

    it("coerces a cleared text field to null rather than an empty string", async () => {
      const handler = (await import("~/server/api/athletes/[id]/vip-settings.patch")).default
      const res = await handler(patchMultipart({ profileDescription: "" }))
      expect(res.success).toBe(true)
      expect(res.data!.profileDescription).toBeNull()
    })
  })
})

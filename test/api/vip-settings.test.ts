import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: vip-settings", () => {
  describe("GET /api/vip-settings", () => {
    it("returns 200 with array of vip decorator settings", async () => {
      const handler = (await import("~/server/api/vip-settings/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
    })

    it("returns 200 when unauthenticated", async () => {
      const handler = (await import("~/server/api/vip-settings/index")).default
      const event = createMockH3Event({ context: {} })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
    })

    it("each item has vpfId, decorator1, and decorator2 fields", async () => {
      const handler = (await import("~/server/api/vip-settings/index")).default
      const event = createMockH3Event({ context: {} })
      const res = await handler(event)
      expect(res.success).toBe(true)
      for (const item of res.data ?? []) {
        expect(item).toHaveProperty("vpfId")
        expect(item).toHaveProperty("decorator1")
        expect(item).toHaveProperty("decorator2")
        expect(typeof item.vpfId).toBe("string")
        expect(typeof item.decorator1 === "string" || item.decorator1 === null).toBe(true)
        expect(typeof item.decorator2 === "string" || item.decorator2 === null).toBe(true)
      }
    })
  })
})

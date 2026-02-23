import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureMeets } from "../fixtures/data"

describe("API: meets", () => {
  describe("GET /api/meets", () => {
    it("returns 200 and list of non-hidden meets", async () => {
      const handler = (await import("~/server/api/meets/index")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
      const visible = res.data!.filter((m: { hidden: boolean }) => !m.hidden)
      expect(visible.length).toBeGreaterThanOrEqual(1)
      const testMeet = res.data!.find((m: { meetSlug: string }) => m.meetSlug === fixtureMeets[0].meetSlug)
      expect(testMeet).toBeDefined()
      expect(testMeet!.hidden).toBe(false)
      expect(testMeet!.meetName).toBe(fixtureMeets[0].meetName)
    })

    it("does not include hidden meets", async () => {
      const handler = (await import("~/server/api/meets/index")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      const hiddenMeet = res.data!.find((m: { meetSlug: string }) => m.meetSlug === "hidden-meet")
      expect(hiddenMeet).toBeUndefined()
    })
  })

  describe("GET /api/meets/[id]", () => {
    it("returns 400 when id is missing", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({ params: {} })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 for non-existent meet id", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({ params: { id: "999999" } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found|Meet/)
    })

    it("returns 200 and meet details by numeric id", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({ params: { id: String(fixtureMeets[0].meetId) } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.meet?.meetId).toBe(fixtureMeets[0].meetId)
      expect(res.data?.meet?.meetSlug).toBe(fixtureMeets[0].meetSlug)
      expect(Array.isArray(res.data?.results)).toBe(true)
      expect(Array.isArray(res.data?.athletes)).toBe(true)
    })

    it("returns 200 and meet details by slug", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({ params: { id: fixtureMeets[0].meetSlug } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.meet?.meetSlug).toBe(fixtureMeets[0].meetSlug)
      expect(res.data?.meet?.meetId).toBe(fixtureMeets[0].meetId)
    })
  })
})

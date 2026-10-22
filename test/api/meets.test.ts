import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureMeets } from "../fixtures/data"

const hiddenMeet = fixtureMeets.find((meet) => meet.hidden)!

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

    // A hidden meet is an unpublished draft. GET /api/meets has always gated
    // them; this endpoint did not, so knowing the slug was enough to read one.
    it("returns 404 for a hidden meet when the caller is anonymous", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({ params: { id: hiddenMeet.meetSlug } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found/i)
    })

    it("returns 404 for a hidden meet when the caller is a non-admin user", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({
        params: { id: hiddenMeet.meetSlug },
        context: { user: { vpfId: "VPF000901", email: "athlete1@test.vpf", role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    /** Not merely "no data": a draft must be as indistinguishable as a missing meet. */
    it("returns the same 404 for a hidden meet as for a missing one", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const hidden = await handler(createMockH3Event({ params: { id: String(hiddenMeet.meetId) } }))
      const missing = await handler(createMockH3Event({ params: { id: "999999" } }))
      expect(hidden.success).toBe(false)
      expect(hidden.message?.en).toBe(missing.message?.en)
    })

    // The admin meet editor loads drafts through this same endpoint.
    it("returns 200 for a hidden meet when the caller is an admin", async () => {
      const handler = (await import("~/server/api/meets/[id]/index")).default
      const event = createMockH3Event({
        params: { id: hiddenMeet.meetSlug },
        context: { user: { vpfId: "VPF000900", email: "admin@test.vpf", role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.meet?.meetSlug).toBe(hiddenMeet.meetSlug)
      expect(res.data?.meet?.hidden).toBe(true)
    })
  })
})

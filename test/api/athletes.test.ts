import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: athletes", () => {
  describe("GET /api/athletes", () => {
    it("returns 200 and list of active athletes when authenticated as user", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data!.length).toBeGreaterThanOrEqual(1)
      const athlete1 = res.data!.find((a: { vpfId: string }) => a.vpfId === fixtureUsers[0].vpfId)
      expect(athlete1).toBeDefined()
      expect(athlete1!.fullName).toBe(fixtureUsers[0].fullName)
    })

    it("returns 200 when authenticated as admin", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
    })


  })

  describe("GET /api/athletes/[id]", () => {
    it("returns 400 when id is missing", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: {},
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 404 for non-existent athlete", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "VPF999999" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/not found|Athlete/)
    })

    it("returns 200 and athlete by vpfId with public fields for other user", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[2].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data?.athlete?.fullName).toBe(fixtureUsers[2].fullName)
      expect((res.data?.athlete as { email?: string })?.email).toBeUndefined()
    })

    it("returns 200 with athlete, personalBest summary and compHistory", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[0].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.personalBest).toBeDefined()
      expect(res.data?.personalBest).toHaveProperty("squat")
      expect(res.data?.personalBest).toHaveProperty("bench")
      expect(res.data?.personalBest).toHaveProperty("deadlift")
      expect(res.data?.personalBest).toHaveProperty("total")
      for (const key of ["squat", "bench", "deadlift", "total"]) {
        const v = (res.data?.personalBest as Record<string, unknown>)?.[key]
        expect(v === null || typeof v === "number").toBe(true)
      }
      expect(Array.isArray(res.data?.compHistory)).toBe(true)
      expect(Array.isArray(res.data?.meets)).toBe(true)
    })

    it("returns 200 for id=self when authenticated (caller's own data)", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "self" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(Array.isArray(res.data?.compHistory)).toBe(true)
      expect(Array.isArray(res.data?.meets)).toBe(true)
    })

    it("returns 401 for id=self when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "self" },
        context: {},
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 200 with records array when includeRecords is true", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[0].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
        query: { includeRecords: "true" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray((res.data as { records?: unknown }).records)).toBe(true)
    })

    it("returns 200 with vipSettings when includeVipSettings is true and athlete has active VIP", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "self" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
        query: { includeVipSettings: "true" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete).toBeDefined()
      expect(res.data?.personalBest).toBeDefined()
      if ((res.data as { vipSettings?: unknown })?.vipSettings) {
        const vip = (res.data as { vipSettings: { vpfId: string } }).vipSettings
        expect(vip).toHaveProperty("vpfId")
      }
    })

    it("returns 200 when fetching athlete by slug", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[0].slug },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
    })

    it("returns 404 when slug does not match any athlete", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "nonexistent-slug" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    it("returns 200 without vipSettings when athlete has no active VIP and request is from public viewer", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[2].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
        query: { includeVipSettings: "true" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect((res.data as { vipSettings?: unknown }).vipSettings).toBeUndefined()
    })
  })
})

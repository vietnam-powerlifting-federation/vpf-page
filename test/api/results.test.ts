import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"

describe("API: results", () => {
  describe("GET /api/results", () => {
    it("returns 200 and results with meets and athletes", async () => {
      const handler = (await import("~/server/api/results/index")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.results)).toBe(true)
      expect(Array.isArray(res.data!.meets)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })

    it("returns 200 with default sort key", async () => {
      const handler = (await import("~/server/api/results/index")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      if (res.data!.results!.length > 0) {
        expect(res.data!.results![0].rank).toBe(1)
      }
    })

    it("returns 400 for invalid sort key", async () => {
      const handler = (await import("~/server/api/results/index")).default
      const event = createMockH3Event({ query: { sort: "invalid" } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|sort/)
    })

    it("accepts valid sort keys", async () => {
      const handler = (await import("~/server/api/results/index")).default
      for (const sort of ["bestSquat", "bestBench", "bestDeadlift", "total", "gl"]) {
        const event = createMockH3Event({ query: { sort } })
        const res = await handler(event)
        expect(res.success).toBe(true)
        expect(Array.isArray(res.data!.results)).toBe(true)
      }
    })

    it("accepts several tiers as a comma-separated meetType", async () => {
      const handler = (await import("~/server/api/results/index")).default
      const res = await handler(createMockH3Event({ query: { meetType: "national,amateur" } }))
      expect(res.success).toBe(true)
      const types = res.data!.meets.map((m) => m.type)
      expect(types.length).toBeGreaterThan(0)
      expect(types.every((type) => type === "national" || type === "amateur")).toBe(true)
    })

    it("accepts distinct=true", async () => {
      const handler = (await import("~/server/api/results/index")).default
      const event = createMockH3Event({ query: { distinct: "true" } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.results)).toBe(true)
    })
  })
})

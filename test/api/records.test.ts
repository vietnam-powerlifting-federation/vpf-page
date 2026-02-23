import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"

describe("API: records", () => {
  describe("GET /api/records", () => {
    it("returns 200 and records payload with optional year", async () => {
      const handler = (await import("~/server/api/records/index")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(Array.isArray(res.data!.records)).toBe(true)
      expect(Array.isArray(res.data!.meet)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })

    it("returns 200 when year query is provided", async () => {
      const handler = (await import("~/server/api/records/index")).default
      const event = createMockH3Event({ query: { year: "2024" } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.records)).toBe(true)
    })
  })

  describe("GET /api/records/history", () => {
    it("returns 200 and history payload", async () => {
      const handler = (await import("~/server/api/records/history")).default
      const event = createMockH3Event()
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(Array.isArray(res.data!.records)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })
  })
})

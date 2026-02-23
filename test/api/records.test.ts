import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: records", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("GET /api/records", () => {
    it("returns 200 and records payload with optional year", async () => {
      const res = await $fetch<{
        success: boolean
        data: { records: unknown[]; meet: unknown[]; athletes: unknown[] }
      }>("/api/records")
      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(Array.isArray(res.data!.records)).toBe(true)
      expect(Array.isArray(res.data!.meet)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })

    it("returns 200 when year query is provided", async () => {
      const res = await $fetch<{ success: boolean; data: { records: unknown[] } }>("/api/records?year=2024")
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.records)).toBe(true)
    })
  })

  describe("GET /api/records/history", () => {
    it("returns 200 and history payload", async () => {
      const res = await $fetch<{
        success: boolean
        data: { records: unknown[]; meet: unknown; athletes: unknown[] }
      }>("/api/records/history")
      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(Array.isArray(res.data!.records)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })
  })
})

import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: results", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("GET /api/results", () => {
    it("returns 200 and results with meets and athletes", async () => {
      const res = await $fetch<{
        success: boolean
        data: { results: unknown[]; meets: unknown[]; athletes: unknown[] }
      }>("/api/results")
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.results)).toBe(true)
      expect(Array.isArray(res.data!.meets)).toBe(true)
      expect(Array.isArray(res.data!.athletes)).toBe(true)
    })

    it("returns 200 with default sort key", async () => {
      const res = await $fetch<{ success: boolean; data: { results: Array<{ rank?: number }> } }>("/api/results")
      expect(res.success).toBe(true)
      if (res.data!.results!.length > 0) {
        expect(res.data!.results![0].rank).toBe(1)
      }
    })

    it("returns 400 for invalid sort key", async () => {
      const res = await $fetch("/api/results?sort=invalid", { ignoreResponseError: true }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Invalid|sort/)
    })

    it("accepts valid sort keys", async () => {
      for (const sort of ["bestSquat", "bestBench", "bestDeadlift", "total", "gl"]) {
        const res = await $fetch<{ success: boolean; data: { results: unknown[] } }>(`/api/results?sort=${sort}`)
        expect(res.success).toBe(true)
        expect(Array.isArray(res.data!.results)).toBe(true)
      }
    })

    it("accepts distinct=true", async () => {
      const res = await $fetch<{ success: boolean; data: { results: unknown[] } }>("/api/results?distinct=true")
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data!.results)).toBe(true)
    })
  })
})

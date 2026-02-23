import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"
import { fixtureMeets } from "../fixtures/data"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: meets", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("GET /api/meets", () => {
    it("returns 200 and list of non-hidden meets", async () => {
      const res = await $fetch<{
        success: boolean
        data: Array<{ meetId: number; meetName: string; meetSlug: string; hidden: boolean }>
      }>("/api/meets")
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
      const visible = res.data!.filter((m) => !m.hidden)
      expect(visible.length).toBeGreaterThanOrEqual(1)
      const testMeet = res.data!.find((m) => m.meetSlug === fixtureMeets[0].meetSlug)
      expect(testMeet).toBeDefined()
      expect(testMeet!.hidden).toBe(false)
      expect(testMeet!.meetName).toBe(fixtureMeets[0].meetName)
    })

    it("does not include hidden meets", async () => {
      const res = await $fetch<{ success: boolean; data: Array<{ meetSlug: string; hidden: boolean }> }>("/api/meets")
      expect(res.success).toBe(true)
      const hiddenMeet = res.data!.find((m) => m.meetSlug === "hidden-meet")
      expect(hiddenMeet).toBeUndefined()
    })
  })

  describe("GET /api/meets/[id]", () => {
    it("returns 400 when id is missing", async () => {
      const res = await $fetch("/api/meets/", { ignoreResponseError: true }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
    })

    it("returns 404 for non-existent meet id", async () => {
      const res = await $fetch("/api/meets/999999", { ignoreResponseError: true }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/not found|Meet/)
    })

    it("returns 200 and meet details by numeric id", async () => {
      const res = await $fetch<{
        success: boolean
        data: { meet: { meetId: number; meetSlug: string }; results: unknown[]; athletes: unknown[] }
      }>(`/api/meets/${fixtureMeets[0].meetId}`)
      expect(res.success).toBe(true)
      expect(res.data?.meet?.meetId).toBe(fixtureMeets[0].meetId)
      expect(res.data?.meet?.meetSlug).toBe(fixtureMeets[0].meetSlug)
      expect(Array.isArray(res.data?.results)).toBe(true)
      expect(Array.isArray(res.data?.athletes)).toBe(true)
    })

    it("returns 200 and meet details by slug", async () => {
      const res = await $fetch<{
        success: boolean
        data: { meet: { meetId: number; meetSlug: string }; results: unknown[] }
      }>(`/api/meets/${fixtureMeets[0].meetSlug}`)
      expect(res.success).toBe(true)
      expect(res.data?.meet?.meetSlug).toBe(fixtureMeets[0].meetSlug)
      expect(res.data?.meet?.meetId).toBe(fixtureMeets[0].meetId)
    })
  })
})

import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"
import { createTestToken } from "../utils/auth"
import { fixtureUsers } from "../fixtures/data"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: athletes", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("GET /api/athletes", () => {
    it("returns 200 and list of active athletes when authenticated as user", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" })
      const res = await $fetch<{ success: boolean; data: Array<{ vpfId: string; fullName: string }> }>("/api/athletes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data!.length).toBeGreaterThanOrEqual(1)
      const athlete1 = res.data!.find((a) => a.vpfId === fixtureUsers[0].vpfId)
      expect(athlete1).toBeDefined()
      expect(athlete1!.fullName).toBe(fixtureUsers[0].fullName)
    })

    it("returns 200 when authenticated as admin", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" })
      const res = await $fetch<{ success: boolean; data: unknown[] }>("/api/athletes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data)).toBe(true)
    })
  })

  describe("GET /api/athletes/[id]", () => {
    it("returns 400 when id is missing", async () => {
      const token = createTestToken()
      const res = await $fetch("/api/athletes/", {
        headers: { Authorization: `Bearer ${token}` },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
    })

    it("returns 404 for non-existent athlete", async () => {
      const token = createTestToken()
      const res = await $fetch("/api/athletes/VPF999999", {
        headers: { Authorization: `Bearer ${token}` },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/not found|Athlete/)
    })

    it("returns 200 and athlete by vpfId with public fields for other user", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[0].vpfId, role: "user" })
      const res = await $fetch<{
        success: boolean
        data: { athlete: { vpfId: string; fullName: string; email?: string } }
      }>(`/api/athletes/${fixtureUsers[2].vpfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data?.athlete?.fullName).toBe(fixtureUsers[2].fullName)
      expect(res.data?.athlete?.email).toBeUndefined()
    })

    it("returns 200 with personalBest when include=personalBest", async () => {
      const token = createTestToken()
      const res = await $fetch<{
        success: boolean
        data: { athlete: { vpfId: string }; personalBest?: unknown[] }
      }>(`/api/athletes/${fixtureUsers[0].vpfId}?include=personalBest`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(Array.isArray(res.data?.personalBest)).toBe(true)
    })

    it("returns 200 with compHistory when include=compHistory", async () => {
      const token = createTestToken()
      const res = await $fetch<{
        success: boolean
        data: { athlete: { vpfId: string }; compHistory?: unknown[] }
      }>(`/api/athletes/${fixtureUsers[0].vpfId}?include=compHistory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data?.compHistory)).toBe(true)
    })
  })
})

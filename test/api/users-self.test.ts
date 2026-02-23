import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"
import { createTestToken } from "../utils/auth"
import { fixtureUsers } from "../fixtures/data"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: users/self", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("GET /api/users/self", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await $fetch("/api/users/self", { ignoreResponseError: true }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 200 and current user profile when authenticated", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" })
      const res = await $fetch<{ success: boolean; data: { vpfId: string; fullName: string; email: string } }>(
        "/api/users/self",
        { headers: { Authorization: `Bearer ${token}` } }
      )
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.fullName).toBe(fixtureUsers[0].fullName)
      expect(res.data?.email).toBe(fixtureUsers[0].email)
    })
  })

  describe("PATCH /api/users/self", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await $fetch("/api/users/self", {
        method: "PATCH",
        body: { nationality: "US" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 400 for invalid patch data", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[0].vpfId, role: "user" })
      const res = await $fetch("/api/users/self", {
        method: "PATCH",
        body: { email: "not-an-email" },
        headers: { Authorization: `Bearer ${token}` },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Invalid|Required|đầu vào/)
    })

    it("returns 200 and updated profile when patch is valid", async () => {
      const token = createTestToken({ vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" })
      const res = await $fetch<{ success: boolean; data: { vpfId: string; nationality: string | null } }>(
        "/api/users/self",
        {
          method: "PATCH",
          body: { nationality: "US" },
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data?.nationality).toBe("US")
    })
  })
})

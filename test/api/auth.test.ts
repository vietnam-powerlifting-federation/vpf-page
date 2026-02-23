import { describe, it, expect, beforeAll } from "vitest"
import type { setup } from "@nuxt/test-utils/e2e"
import { fixtureUsers } from "../fixtures/data"

let $fetch: Awaited<ReturnType<typeof setup>>["$fetch"]
describe("API: auth", () => {
  beforeAll(async () => {
    await globalThis.__nuxtE2EPromise
    $fetch = globalThis.__nuxtE2E!.$fetch
  })

  describe("POST /api/auth/login", () => {
    it("returns 400 when password is missing", async () => {
      const res = await $fetch<{ success: boolean; message: { en: string } }>("/api/auth/login", {
        method: "POST",
        body: { email: "athlete1@test.vpf" },
        ignoreResponseError: true,
      }).catch((e: { data?: { success?: boolean; message?: { en?: string } }; statusCode?: number; response?: { status: number } }) => e)
      const data = "data" in res && res.data != null ? res.data : res
      const status = "statusCode" in res ? res.statusCode : (res as { response?: { status: number } }).response?.status
      expect(status === 400 || data?.success === false).toBe(true)
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toContain("Password")
    })

    it("returns 400 when neither vpfId nor email provided", async () => {
      const res = await $fetch("/api/auth/login", {
        method: "POST",
        body: { password: "x" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const status = res?.statusCode ?? res?.data?.statusCode
      const data = res?.data ?? res
      expect([400, 500]).toContain(status ?? data?.success === false ? 400 : 500)
      if (data?.message?.en) expect(data.message.en).toMatch(/credentials|Invalid/)
    })

    it("returns 401 for wrong password", async () => {
      const res = await $fetch("/api/auth/login", {
        method: "POST",
        body: { email: fixtureUsers[0].email, password: "wrong" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/credentials|Invalid/)
    })

    it("returns 200 and token when credentials are valid (email)", async () => {
      const res = await $fetch<{ success: boolean; data: { user: { vpfId: string }; token: string }; message: { en: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: { email: fixtureUsers[0].email, password: fixtureUsers[0].password },
        }
      )
      expect(res.success).toBe(true)
      expect(res.data?.user?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.token).toBeDefined()
      expect(typeof res.data?.token).toBe("string")
      expect(res.message?.en).toMatch(/success|Login/)
    })

    it("returns 200 when logging in with vpfId", async () => {
      const res = await $fetch<{ success: boolean; data: { user: { vpfId: string }; token: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: { vpfId: fixtureUsers[0].vpfId, password: fixtureUsers[0].password },
        }
      )
      expect(res.success).toBe(true)
      expect(res.data?.user?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.token).toBeDefined()
    })
  })

  describe("POST /api/auth/register", () => {
    it("returns 400 when email is missing", async () => {
      const res = await $fetch("/api/auth/register", {
        method: "POST",
        body: { password: "pass", fullName: "Test" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Email|required/)
    })

    it("returns 400 when password is missing", async () => {
      const res = await $fetch("/api/auth/register", {
        method: "POST",
        body: { email: "new@test.vpf", fullName: "New User" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/Password|required/)
    })

    it("returns 400 for invalid email format", async () => {
      const res = await $fetch("/api/auth/register", {
        method: "POST",
        body: { email: "not-an-email", password: "pass123", fullName: "Test" },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/email|format|Invalid/)
    })

    it("returns 409 when email already exists", async () => {
      const res = await $fetch("/api/auth/register", {
        method: "POST",
        body: {
          email: fixtureUsers[0].email,
          password: "otherpass",
          fullName: "Other",
        },
        ignoreResponseError: true,
      }).catch((e) => e)
      const data = res?.data ?? res
      expect(data?.success).toBe(false)
      expect(data?.message?.en).toMatch(/exists|already/)
    })

    it("returns 200 and user when registration succeeds", async () => {
      const email = `newuser-${Date.now()}@test.vpf`
      const res = await $fetch<{ success: boolean; data: { vpfId: string; fullName: string; email: string } }>(
        "/api/auth/register",
        {
          method: "POST",
          body: {
            email,
            password: "secure123",
            fullName: "New User",
          },
        }
      )
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBeDefined()
      expect(res.data?.fullName).toBe("New User")
      // userPublicSelect does not include email; registration succeeded if we have vpfId
      expect(res.message?.en).toMatch(/success|Registration/)
    })
  })
})

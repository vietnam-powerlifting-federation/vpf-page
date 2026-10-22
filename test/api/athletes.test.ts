import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: athletes", () => {
  describe("GET /api/athletes", () => {
    it("returns 200 and a page of active athletes when authenticated as user", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data?.items)).toBe(true)
      expect(res.data!.items.length).toBeGreaterThanOrEqual(1)
      expect(res.data!.total).toBeGreaterThanOrEqual(res.data!.items.length)
      const athlete1 = res.data!.items.find((a: { vpfId: string }) => a.vpfId === fixtureUsers[0].vpfId)
      expect(athlete1).toBeDefined()
      expect(athlete1!.fullName).toBe(fixtureUsers[0].fullName)
      // Public columns only.
      expect((athlete1 as { email?: string }).email).toBeUndefined()
    })

    it("returns 200 when authenticated as admin", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(Array.isArray(res.data?.items)).toBe(true)
      // Admins get the private columns they need to act on an athlete.
      expect(res.data!.items[0]).toHaveProperty("email")
    })

    it("searches by VPF id, name and email for admins", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } },
        query: { search: fixtureUsers[0].vpfId },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data!.items.map((a: { vpfId: string }) => a.vpfId)).toEqual([fixtureUsers[0].vpfId])
    })

    it("ignores admin-only filters for a non-admin caller", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
        query: { search: fixtureUsers[1].vpfId, includeInactive: "true" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      // The search would have narrowed to one row had it been honoured.
      expect(res.data!.items.length).toBeGreaterThan(1)
    })

    it("paginates", async () => {
      const handler = (await import("~/server/api/athletes/index")).default
      const event = createMockH3Event({
        context: { user: { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } },
        query: { page: "1", pageSize: "1" },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data!.items).toHaveLength(1)
      expect(res.data!.pageSize).toBe(1)
      expect(res.data!.total).toBeGreaterThan(1)
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

    // The record endpoint is read on nearly every page load, so it deliberately
    // does not join the competition history — that lives on /profile.
    it("returns the record and its vip settings, without any competition history", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[0].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "admin" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data).toHaveProperty("vipSettings")
      expect(res.data).not.toHaveProperty("compHistory")
      expect(res.data).not.toHaveProperty("personalBest")
      expect(res.data).not.toHaveProperty("meets")
    })

    it("returns 200 for id=me when authenticated (caller's own data)", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "me" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
    })

    it("returns 401 for id=me when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "me" },
        context: {},
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })

    /**
     * `scope` is the discriminant that lets a caller tell which column set it
     * got, instead of probing for fields that may or may not be there.
     */
    it("labels the caller's own record as private and someone else's as public", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const own = await handler(createMockH3Event({
        params: { id: "me" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      }))
      const other = await handler(createMockH3Event({
        params: { id: fixtureUsers[2].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      }))
      expect(own.data?.scope).toBe("private")
      expect(other.data?.scope).toBe("public")
    })

    it("labels an admin's read of another athlete as private", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const res = await handler(createMockH3Event({
        params: { id: fixtureUsers[2].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "admin" } },
      }))
      expect(res.data?.scope).toBe("private")
      expect((res.data?.athlete as { email?: string })?.email).toBeDefined()
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

    it("returns vipSettings as null rather than omitting it when VIP is not active", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: fixtureUsers[2].vpfId },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect((res.data as { vipSettings?: unknown }).vipSettings).toBeNull()
    })
  })

  describe("GET /api/athletes/[id]/profile", () => {
    it("returns the aggregate with every field present and no flags required", async () => {
      const handler = (await import("~/server/api/athletes/[id]/profile.get")).default
      const event = createMockH3Event({ params: { id: fixtureUsers[0].vpfId } })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.personalBest).toHaveProperty("squat")
      expect(res.data?.personalBest).toHaveProperty("bench")
      expect(res.data?.personalBest).toHaveProperty("deadlift")
      expect(res.data?.personalBest).toHaveProperty("total")
      expect(Array.isArray(res.data?.compHistory)).toBe(true)
      expect(Array.isArray(res.data?.meets)).toBe(true)
      // Previously gated behind includeRecords; now always returned.
      expect(Array.isArray(res.data?.records)).toBe(true)
      expect(res.data).toHaveProperty("vipSettings")
    })

    it("accepts a slug and 'me' as the identifier, like every other athlete route", async () => {
      const handler = (await import("~/server/api/athletes/[id]/profile.get")).default
      const bySlug = await handler(createMockH3Event({ params: { id: fixtureUsers[0].slug } }))
      const byMe = await handler(createMockH3Event({
        params: { id: "me" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      }))
      expect(bySlug.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(byMe.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
    })

    /**
     * A hidden meet is an unpublished draft, so it must not surface through the
     * profile of an athlete entered in it. This was opt-in via `excludeHidden`,
     * a flag no caller ever passed.
     */
    it("never includes hidden meets", async () => {
      const handler = (await import("~/server/api/athletes/[id]/profile.get")).default
      const res = await handler(createMockH3Event({ params: { id: fixtureUsers[0].vpfId } }))
      expect(res.success).toBe(true)
      expect(res.data!.meets.every((meet) => !meet.hidden)).toBe(true)
    })

    it("returns 401 for me without a session and 404 for an unknown slug", async () => {
      const handler = (await import("~/server/api/athletes/[id]/profile.get")).default
      const anon = await handler(createMockH3Event({ params: { id: "me" }, context: {} }))
      const missing = await handler(createMockH3Event({ params: { id: "nonexistent-slug" } }))
      expect(anon.success).toBe(false)
      expect(missing.success).toBe(false)
      expect(missing.message?.en).toMatch(/not found/i)
    })
  })
})

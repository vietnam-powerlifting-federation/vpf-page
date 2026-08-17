import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

describe("API: athletes/[id] with id=me", () => {
  describe("GET /api/athletes/me", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({ params: { id: "me" }, context: { user: undefined } })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 200 and current athlete profile when authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index")).default
      const event = createMockH3Event({
        params: { id: "me" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.athlete?.vpfId).toBe(fixtureUsers[0].vpfId)
      expect(res.data?.athlete?.fullName).toBe(fixtureUsers[0].fullName)
      expect((res.data?.athlete as { email?: string })?.email).toBe(fixtureUsers[0].email)
    })
  })

  describe("PATCH /api/athletes/me", () => {
    it("returns 401 when not authenticated", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        body: { nationality: "US" },
        context: { user: undefined },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Unauthorized|phép/)
    })

    it("returns 403 when a non-admin patches an id other than me", async () => {
      // The endpoint serves both self-service and admin edits (admin tools spec
      // §4.1), so any id but "me" now falls to the admin branch and is refused
      // unless the caller actually is one.
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: fixtureUsers[0].vpfId },
        body: { nationality: "US" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Only admins|Chỉ quản trị viên/)
    })

    it("returns 400 for invalid patch data", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        body: { email: "not-an-email" },
        context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid|Required|đầu vào/)
    })

    it("returns 200 and updated profile when patch is valid", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        body: { nationality: "US" },
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.vpfId).toBe(fixtureUsers[2].vpfId)
      expect(res.data?.nationality).toBe("US")
    })
  })

  describe("PATCH /api/athletes/me multipart (competition photo upload)", () => {
    it("coerces numeric text fields (e.g. rack pins) before saving", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        multipart: [{ name: "squatRackPin", data: Buffer.from("5") }],
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(true)
      expect(res.data?.squatRackPin).toBe(5)
    })

    it("returns 400 when the photo part has a disallowed mime type", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        multipart: [
          { name: "competitionPhoto", data: Buffer.from("not-an-image"), filename: "photo.svg", type: "image/svg+xml" },
        ],
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
      expect(res.message?.en).toMatch(/Invalid image type|không hợp lệ/)
    })

    it("returns 400 for empty multipart form data", async () => {
      const handler = (await import("~/server/api/athletes/[id]/index.patch")).default
      const event = createMockH3Event({
        method: "PATCH",
        params: { id: "me" },
        multipart: [],
        context: { user: { vpfId: fixtureUsers[2].vpfId, email: fixtureUsers[2].email, role: "user" } },
      })
      const res = await handler(event)
      expect(res.success).toBe(false)
    })
  })
})

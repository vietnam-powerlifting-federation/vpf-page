import { describe, it, expect, afterEach, afterAll } from "vitest"
import { eq, like } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

const admin = { vpfId: fixtureUsers[1].vpfId, email: fixtureUsers[1].email, role: "admin" } as const

const SLUG_PREFIX = "cache-inv-"
const SLUG = `${SLUG_PREFIX}meet`

async function importCreate() {
  return (await import("~/server/api/meets/index.post")).default
}
async function importPatch() {
  return (await import("~/server/api/meets/[id]/index.patch")).default
}
async function importMeetDetails() {
  return (await import("~/server/api/meets/[id]/index")).default
}
async function importClearCache() {
  return (await import("~/server/api/admin/records-cache.post")).default
}

async function createMeet(meetName: string) {
  const handler = await importCreate()
  const res = await handler(createMockH3Event({
    method: "POST",
    context: { user: admin },
    body: { meetName, meetSlug: SLUG, systemYear: 2026, hidden: false },
  }))
  expect(res.success).toBe(true)
  return res.data!
}

async function readMeetName(): Promise<string> {
  const handler = await importMeetDetails()
  const res = await handler(createMockH3Event({ params: { id: SLUG } }))
  expect(res.success).toBe(true)
  return res.data!.meet.meetName
}

async function cleanup() {
  await db.delete(meets).where(like(meets.meetSlug, `${SLUG_PREFIX}%`))
}

describe("API: public data cache invalidation", () => {
  afterEach(cleanup)
  afterAll(cleanup)

  it("serves a repeat meet read from the cache", async () => {
    const created = await createMeet("Before")
    expect(await readMeetName()).toBe("Before")

    // Written straight to the database, bypassing the handler that would
    // invalidate. The cached response must therefore still be the old one —
    // this is what proves the read above was actually cached.
    await db.update(meets).set({ meetName: "Changed Behind The Cache" })
      .where(eq(meets.meetId, created.meetId))

    expect(await readMeetName()).toBe("Before")
  })

  it("shows a meet update immediately", async () => {
    const created = await createMeet("Before")
    expect(await readMeetName()).toBe("Before")

    const patch = await importPatch()
    const res = await patch(createMockH3Event({
      method: "PATCH",
      context: { user: admin },
      params: { id: String(created.meetId) },
      body: { meetName: "After" },
    }))
    expect(res.success).toBe(true)

    // Before invalidation was wired into the write paths this returned "Before"
    // until the cache entry aged out — and Redis entries never age out.
    expect(await readMeetName()).toBe("After")
  })

  it("clears the cache from the admin endpoint", async () => {
    const created = await createMeet("Before")
    await readMeetName()

    await db.update(meets).set({ meetName: "Fixed By Hand" })
      .where(eq(meets.meetId, created.meetId))

    const handler = await importClearCache()
    const res = await handler(createMockH3Event({ method: "POST", context: { user: admin } }))
    expect(res.success).toBe(true)
    expect(res.data!.cleared).toBeGreaterThan(0)

    expect(await readMeetName()).toBe("Fixed By Hand")
  })

  it("rejects a cache clear from a non-admin", async () => {
    const handler = await importClearCache()
    const res = await handler(createMockH3Event({
      method: "POST",
      context: { user: { vpfId: fixtureUsers[0].vpfId, email: fixtureUsers[0].email, role: "user" } },
    }))
    expect(res.success).toBe(false)
  })
})

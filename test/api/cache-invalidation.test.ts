import { describe, it, expect, afterEach, afterAll } from "vitest"
import { eq, like } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { meets } from "~/lib/external/drizzle/migrations/schema"
import { createMockH3Event } from "../utils/h3-event"
import { fixtureUsers } from "../fixtures/data"

const ONE_DAY_SECONDS = 60 * 60 * 24

/** Expiries recorded by test/setup/redisMock.ts for the keys written so far. */
function redisMockTtls(): Map<string, number | undefined> {
  return globalThis.__vpfRedisMockTtls
}

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

  // Pins the trade-off deliberately rather than leaving it undiscovered: an
  // ordinary meet edit is NOT invalidated, so it stays hidden until the day's TTL
  // expires or someone clears the cache. Only a results import clears eagerly.
  it("keeps serving a stale meet after an edit until the cache is cleared", async () => {
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

    expect(await readMeetName()).toBe("Before")

    const clear = await importClearCache()
    expect((await clear(createMockH3Event({ method: "POST", context: { user: admin } }))).success).toBe(true)

    expect(await readMeetName()).toBe("After")
  })

  it("writes every cache entry with an expiry", async () => {
    await createMeet("Before")
    await readMeetName()

    const ttls = redisMockTtls()
    expect(ttls.size).toBeGreaterThan(0)
    // Nothing may be stored without a TTL: an entry that never expires is one
    // that can only be corrected by hand.
    for (const [key, ttl] of ttls) {
      expect(ttl, `${key} was cached without an expiry`).toBe(ONE_DAY_SECONDS)
    }
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

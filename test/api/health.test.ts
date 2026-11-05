import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"

async function importHealth() {
  return (await import("~/server/api/health.get")).default
}

describe("API: health", () => {
  it("reports the database up and the mocked-out cache as disabled", async () => {
    const handler = await importHealth()
    const res = await handler(createMockH3Event())

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ database: "ok", cache: "disabled" })
  })
})

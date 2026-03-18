import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"

describe("API: auth/session", () => {
  it("returns 401 when not authenticated", async () => {
    const handler = (await import("~/server/api/auth/session.get")).default
    const event = createMockH3Event({ context: { user: undefined } })
    const res = await handler(event)
    expect(res.success).toBe(false)
    expect(res.message?.en).toMatch(/Unauthorized|phép/)
  })

  it("returns 200 and session payload when authenticated", async () => {
    const handler = (await import("~/server/api/auth/session.get")).default
    const event = createMockH3Event({
      context: { user: { vpfId: "VPF999999", email: "test@example.com", role: "user" } },
    })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.vpfId).toBe("VPF999999")
    expect(res.data?.email).toBe("test@example.com")
  })
})

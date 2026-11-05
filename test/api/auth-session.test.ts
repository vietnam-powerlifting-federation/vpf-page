import { describe, it, expect } from "vitest"
import { createMockH3Event } from "../utils/h3-event"
import { TEST_USER_IDS, UNKNOWN_USER_ID } from "../fixtures/data"
import { createTestToken } from "../utils/auth"

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
      context: { user: { userId: UNKNOWN_USER_ID, vpfId: "VPF999999", email: "test@example.com", role: "user" } },
    })
    const res = await handler(event)
    expect(res.success).toBe(true)
    expect(res.data?.vpfId).toBe("VPF999999")
    expect(res.data?.email).toBe("test@example.com")
  })

  it("treats a token issued before user ids as signed out", async () => {
    const jwt = (await import("jsonwebtoken")).default
    const { config } = await import("~/lib/config/config")
    const { verifyToken } = await import("~/lib/external/jwt")
    const legacy = jwt.sign({ vpfId: "VPF000901", email: "athlete1@test.vpf", role: "user" }, config.jwtSecret)
    expect(verifyToken(legacy)).toBeNull()
    expect(verifyToken(createTestToken())?.userId).toBe(TEST_USER_IDS.VPF000901)
  })
})

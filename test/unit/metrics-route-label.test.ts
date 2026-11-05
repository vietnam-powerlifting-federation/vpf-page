import { describe, it, expect } from "vitest"
import { routeLabel } from "~/server/utils/metrics"

describe("routeLabel", () => {
  it("keeps an API route pattern as it is", () => {
    expect(routeLabel("/api/athletes/:id/profile")).toBe("/api/athletes/:id/profile")
  })

  it("names the renderer catch-all and unmatched static files", () => {
    expect(routeLabel("/**")).toBe("page")
    expect(routeLabel(undefined)).toBe("static")
  })
})

import { describe, it, expect } from "vitest"
import { normalizeExternalUrl } from "~/lib/utils/client"

describe("normalizeExternalUrl", () => {
  it("keeps an absolute http(s) url untouched", () => {
    expect(normalizeExternalUrl("https://facebook.com/kien")).toBe("https://facebook.com/kien")
    expect(normalizeExternalUrl("http://example.com")).toBe("http://example.com")
  })

  it("adds https to a scheme-less url", () => {
    // Without this the browser resolves it against our own origin and 404s.
    expect(normalizeExternalUrl("www.facebook.com/kien")).toBe("https://www.facebook.com/kien")
    expect(normalizeExternalUrl("instagram.com/kien")).toBe("https://instagram.com/kien")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeExternalUrl("  facebook.com/kien  ")).toBe("https://facebook.com/kien")
  })

  it("rejects non-http schemes", () => {
    expect(normalizeExternalUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeExternalUrl("data:text/html,<script>")).toBeNull()
  })

  it("returns null for empty input", () => {
    expect(normalizeExternalUrl(null)).toBeNull()
    expect(normalizeExternalUrl(undefined)).toBeNull()
    expect(normalizeExternalUrl("   ")).toBeNull()
  })
})

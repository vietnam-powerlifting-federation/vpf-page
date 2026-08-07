import { describe, it, expect } from "vitest"
import { isVipActive } from "~/lib/utils/vip"

function isoOffsetDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

describe("isVipActive", () => {
  // Athletes are created without an expiry (register.post.ts never sets one), so
  // treating null as active would give every registered athlete a free VIP profile.
  it("treats a missing expiry as not VIP", () => {
    expect(isVipActive(null)).toBe(false)
    expect(isVipActive(undefined as unknown as string | null)).toBe(false)
    expect(isVipActive("")).toBe(false)
  })

  it("is active on a future expiry", () => {
    expect(isVipActive(isoOffsetDays(1))).toBe(true)
    expect(isVipActive("2999-12-31")).toBe(true)
  })

  it("is active on the expiry date itself", () => {
    expect(isVipActive(isoOffsetDays(0))).toBe(true)
  })

  it("is not active once the expiry has passed", () => {
    expect(isVipActive(isoOffsetDays(-1))).toBe(false)
    expect(isVipActive("2000-01-01")).toBe(false)
  })
})

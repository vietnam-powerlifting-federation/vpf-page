import { describe, it, expect } from "vitest"
import { buildPatchPayload } from "~/lib/utils/client"

describe("buildPatchPayload", () => {
  it("emits only changed keys", () => {
    const patch = buildPatchPayload({ a: 1, b: 2 }, { a: 1, b: 3 })
    expect(patch).toEqual({ b: 2 })
  })

  it("skips nulls by default, so clearing a field is not sent", () => {
    const patch = buildPatchPayload({ alias: null, bio: "hi" }, { alias: "old", bio: null })
    expect(patch).toEqual({ bio: "hi" })
  })

  it("emits nulls with includeNulls, so a cover photo can be removed", () => {
    const patch = buildPatchPayload(
      { bannerImageUrl1: null, alias: "x" },
      { bannerImageUrl1: "https://cdn/1.png", alias: "x" },
      { includeNulls: true },
    )
    expect(patch).toEqual({ bannerImageUrl1: null })
  })

  it("does not emit a null that was already null", () => {
    const patch = buildPatchPayload({ alias: null }, { alias: null }, { includeNulls: true })
    expect(patch).toEqual({})
  })

  it("always skips undefined, even with includeNulls", () => {
    const patch = buildPatchPayload(
      { alias: undefined, bio: "hi" },
      { alias: "old", bio: "old" },
      { includeNulls: true },
    )
    expect(patch).toEqual({ bio: "hi" })
  })
})

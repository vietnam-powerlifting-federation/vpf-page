/**
 * Diff a form against its pristine copy into a PATCH body.
 *
 * By default a null value is skipped, so clearing a field is not sent. Pass
 * `includeNulls` when the form needs to clear values server-side (e.g. removing a
 * VIP cover photo) — only safe when `original` is seeded from the same shape as
 * `current`, otherwise keys absent from `original` are emitted as spurious nulls.
 */
export function buildPatchPayload<T extends Record<string, unknown>>(
  current: T,
  original: Partial<T>,
  options: { includeNulls?: boolean } = {}
): Partial<T> {
  const payload: Partial<T> = {}

  ;(Object.keys(current) as (keyof T)[]).forEach((key) => {
    const newValue = current[key]
    const oldValue = original[key]

    if (newValue === undefined) return
    if (newValue === null && !options.includeNulls) return
    if (newValue !== oldValue) {
      payload[key] = newValue
    }
  })

  return payload
}

// Format weight class
export function formatWeightClass(weightClass: number | null | undefined, sex?: string | null): string {
  if (!weightClass) return "-"
  if (weightClass === 999) {
    // 999 means different things based on gender: 120+kg for male, 84+kg for female
    if (sex === "female") return "84+kg"
    return "120+kg" // default to male or when sex is not provided
  }
  return `${weightClass}kg`
}

// Format sex
export function formatSex(sex: string | null | undefined): string {
  if (!sex) return "-"
  return sex.charAt(0).toUpperCase() + sex.slice(1)
}

export function formatSexAlternative(sex: string | null | undefined): string {
  if (!sex) return "-"
  return sex === "male" ? "Men" : "Women"
}

// Format division
export function formatDivision(division: string | null | undefined): string {
  if (!division) return "-"
  const divisionMap: Record<string, string> = {
    open: "Open",
    jr: "Junior",
    subjr: "Sub-Junior",
    mas1: "Master I",
    mas2: "Master II",
    mas3: "Master III",
    mas4: "Master IV",
    guest: "Guest"
  }
  return divisionMap[division] || division
}

// Format weight
export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) return "-"
  return weight.toFixed(2)
}

// Format GL points
export function formatGL(gl: number | null | undefined): string {
  if (gl === null || gl === undefined) return "-"
  return gl.toFixed(2)
}

/**
 * Make an athlete-entered social link safe to put in an href.
 *
 * Athletes routinely type "facebook.com/name" without a scheme, which the browser would
 * resolve against our own origin (openvpf.vn/facebook.com/name) and 404. Anything that is
 * not http(s) — javascript:, data: — is rejected outright rather than rendered as a link.
 */
export function normalizeExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  return `https://${trimmed}`
}

// Gradient style for VIP athlete names (same as VipProfile.vue nameStyle)
export function nameGradientStyle(decorator1?: string | null, decorator2?: string | null): Record<string, string> {
  if (!decorator1 && !decorator2) return {}
  const from = decorator1 || "#ffffff"
  const to = decorator2 || "#ffffff"
  return {
    background: `linear-gradient(to right, ${from}, ${to})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
  }
}

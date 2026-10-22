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

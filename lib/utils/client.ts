export function buildPatchPayload<T extends Record<string, unknown>>(
  current: T,
  original: Partial<T>
): Partial<T> {
  const payload: Partial<T> = {}

  ;(Object.keys(current) as (keyof T)[]).forEach((key) => {
    const newValue = current[key]
    const oldValue = original[key]

    if (newValue === null || newValue === undefined) return
    if (newValue !== oldValue) {
      payload[key] = newValue
    }
  })

  return payload
}

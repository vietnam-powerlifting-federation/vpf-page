/**
 * Formats an ISO date string as DD/MM/YYYY. Returns "-" for empty values and
 * echoes the input back unchanged if it cannot be parsed.
 */
export function formatDateDMY(date: string | null | undefined): string {
  if (!date) return "-"
  try {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return date
  }
}

/** A calendar date as "YYYY-MM-DD" in the visitor's own time zone (what a date picker shows), or null. */
export function toIsoDate(date: Date | null): string | null {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** The date picker's value for a stored "YYYY-MM-DD" date, or null. */
export function fromIsoDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00`) : null
}

/** Whether a stored "YYYY-MM-DD" date is before today. */
export function isPastDate(value: string | null): boolean {
  return Boolean(value) && value! < new Date().toISOString().slice(0, 10)
}

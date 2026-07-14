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

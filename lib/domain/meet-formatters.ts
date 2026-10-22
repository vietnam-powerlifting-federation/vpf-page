import type { MeetType } from "~/types/union-types"

export function formatMeetDate(date: string | null): string {
  if (!date) return "-"
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return date
  }
}

/**
 * Derive a URL slug from a meet name. Vietnamese diacritics are folded to ASCII
 * so the public URL stays typeable and stable; `đ` needs its own rule because it
 * is a distinct letter rather than a decorated `d`.
 *
 * The result is only a suggestion — the meet form lets staff override it, and the
 * handler is what enforces uniqueness.
 */
export function slugifyMeetName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatMeetTypeLabel(type: MeetType | null): string {
  if (!type) return "-"
  const typeMap: Record<MeetType, string> = {
    national: "National",
    amateur: "Amateur",
    professional: "Professional",
    national_qualifier: "National Qualifier",
    other: "Other",
  }
  return typeMap[type] || type
}

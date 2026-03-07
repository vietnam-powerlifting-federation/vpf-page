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

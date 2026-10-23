import type { MeetPublic } from "~/types/meets"

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

/** Meets grouped by the year they were held (the season when there is no date), keeping the order given. */
export function groupMeetsByYear(meets: MeetPublic[]): { year: string; meets: MeetPublic[] }[] {
  const groups = new Map<string, MeetPublic[]>()
  for (const meet of meets) {
    const year = meet.hostDate ? String(new Date(meet.hostDate).getUTCFullYear()) : String(meet.systemYear)
    const list = groups.get(year)
    if (list) list.push(meet)
    else groups.set(year, [meet])
  }
  return [...groups].map(([year, list]) => ({ year, meets: list }))
}

import type { Division, MeetType, Sex } from "~/types/union-types"

/**
 * Display formatting shared by the tables, cards and forms. Pure and isomorphic.
 *
 * Labels are returned as i18n keys rather than strings, so callers translate
 * them with `t()` in the active locale.
 */

/** Weight class 999 is the open-ended top class: 120+ kg for men, 84+ kg for women. */
export function formatWeightClass(weightClass: number | null | undefined, sex?: Sex | string | null): string {
  if (!weightClass) return "–"
  if (weightClass === 999) return sex === "female" ? "84+ kg" : "120+ kg"
  return `${weightClass} kg`
}

function intlLocale(locale: string): string {
  return locale === "vi" ? "vi-VN" : "en-GB"
}

/** Kilograms as entered: up to two decimals, no trailing zeros (262.5, 300, 58.02). */
export function formatKg(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "–"
  return value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })
}

/** GL points always show two decimals. */
export function formatGl(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "–"
  return value.toLocaleString(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatInteger(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "–"
  return value.toLocaleString(intlLocale(locale))
}

/** Vietnamese đồng, e.g. "300.000 ₫". */
export function formatVnd(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "–"
  return `${value.toLocaleString(intlLocale(locale))} ₫`
}

/** "21 Dec 2025" / "21 thg 12, 2025". Dates are calendar dates, so they are read in UTC. */
export function formatDate(date: string | Date | null | undefined, locale: string, style: "short" | "long" = "short"): string {
  if (!date) return "–"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)
  return d.toLocaleDateString(intlLocale(locale), {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export const SEX_LABEL_KEY: Record<Sex, string> = {
  male: "general.men",
  female: "general.women",
}

export const DIVISION_LABEL_KEY: Record<Division, string> = {
  subjr: "general.divisionSubJunior",
  jr: "general.divisionJunior",
  open: "general.divisionOpen",
  mas1: "general.divisionMaster1",
  mas2: "general.divisionMaster2",
  mas3: "general.divisionMaster3",
  mas4: "general.divisionMaster4",
  guest: "general.divisionGuest",
}

export const MEET_TYPE_LABEL_KEY: Record<MeetType, string> = {
  national: "general.meetTypeNational",
  national_qualifier: "general.meetTypeNationalQualifier",
  amateur: "general.meetTypeAmateur",
  professional: "general.meetTypeProfessional",
  other: "general.meetTypeOther",
}

/**
 * Accent- and case-insensitive form for search: "Nguyễn Văn Đức" → "nguyen van duc".
 * `đ` is its own letter rather than a decorated `d`, so it needs its own rule.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}

const HEX = /^#[0-9a-f]{3,8}$/i

/**
 * Style for a VIP athlete's coloured name.
 *
 * Athletes pick any colours, and a pale gold that looks right on a dark board
 * disappears on a white table. The colours are mixed towards black on light
 * surfaces and towards white on dark ones, which keeps their hue but makes the
 * name readable on both. `surface: "board"` is for the always-dark board.
 */
export function nameDecoratorStyle(
  decorator1?: string | null,
  decorator2?: string | null,
  surface: "theme" | "board" = "theme",
): Record<string, string> {
  const colors = [decorator1, decorator2].filter((c): c is string => !!c && HEX.test(c))
  if (colors.length === 0) return {}
  const forDark = (c: string) => `color-mix(in oklch, ${c} 75%, white)`
  const forLight = (c: string) => `color-mix(in oklch, ${c} 55%, black)`
  const readable = (c: string) => (surface === "board" ? forDark(c) : `light-dark(${forLight(c)}, ${forDark(c)})`)
  const [from, to = from] = colors.map(readable)
  return {
    backgroundImage: `linear-gradient(to right, ${from}, ${to})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  }
}

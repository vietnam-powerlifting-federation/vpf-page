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

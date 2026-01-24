import type { Sex } from "~/types/union-types"
import type { Result, ResultRaw, LegacyResultRaw } from "~/types/results"
import { DISQUALIFIED, WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE } from "~/lib/constants/constants"

// Calculate best lift from 3 attempts
// Returns max(lift1, lift2, lift3, 0), or null if all attempts are null
function calculateBestLift(lift1: number | null, lift2: number | null, lift3: number | null): number | null {
  const values = [lift1, lift2, lift3].filter(v => v !== null) as number[]
  // If all are null, return null
  if (values.length === 0) return null
  // Otherwise return max of non-null values and 0
  return Math.max(...values, 0)
}

// Check if bodyweight is valid for weight class
function isValidBodyweight(bodyweight: number | null, weightClass: number, sex: Sex): boolean {
  if (bodyweight === null) return false
  
  const weightClasses = sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE
  const classIndex = weightClasses.indexOf(weightClass)
  
  if (classIndex === -1) return false
  
  const minWeight = classIndex === 0 ? 0 : weightClasses[classIndex - 1]
  const maxWeight = weightClass
  
  return bodyweight > minWeight && bodyweight <= maxWeight
}

// Check if result should be disqualified
function isDisqualified(
  bestSquat: number | null,
  bestBench: number | null,
  bestDeadlift: number | null,
  bodyweight: number | null,
  weightClass: number,
  sex: Sex,
  ranked: boolean | null | undefined
): boolean {
  // Any maxlift is 0 or null
  if (bestSquat === null || bestSquat === 0 ||
      bestBench === null || bestBench === 0 ||
      bestDeadlift === null || bestDeadlift === 0) {
    return true
  }
  
  // Bodyweight invalid
  if (!isValidBodyweight(bodyweight, weightClass, sex)) {
    return true
  }
  
  // Not ranked
  if (ranked === false) {
    return true
  }
  
  return false
}

export function calculateGLPointsRaw(totalKg: number, bodyweightKg: number, sex: Sex = "male") {
  const coeffs = {
    male:   { a: 1199.72839, b: 1025.18162, c: 0.009210 },
    female: { a: 610.32796, b: 1045.59282, c: 0.03048 }
  }
  
  const { a, b, c } = coeffs[sex]
  
  return (
    100 * totalKg / (a - b * Math.exp(-c * bodyweightKg))
  )
}

export function addMetadataToMeetResults(rawResults: (ResultRaw | LegacyResultRaw)[]): Result[] {
  // Step 1: Calculate best lifts and totals for each result
  const resultsWithTotals = rawResults.map((raw): Result => {
    // Check if it's legacy format (has bestSquat, bestBench, bestDeadlift)
    const isLegacy = "bestSquat" in raw && raw.bestSquat !== undefined
    
    let bestSquat: number | null
    let bestBench: number | null
    let bestDeadlift: number | null
    
    // Build the base result with all required fields
    const baseResult: Partial<Result> = { ...raw }
    
    if (isLegacy) {
      const legacy = raw as LegacyResultRaw
      bestSquat = legacy.bestSquat
      bestBench = legacy.bestBench
      bestDeadlift = legacy.bestDeadlift
      
      // Add missing raw fields for legacy results
      baseResult.squat1 = null
      baseResult.squat2 = null
      baseResult.squat3 = null
      baseResult.bench1 = null
      baseResult.bench2 = null
      baseResult.bench3 = null
      baseResult.deadlift1 = null
      baseResult.deadlift2 = null
      baseResult.deadlift3 = null
    } else {
      const modern = raw as ResultRaw
      bestSquat = calculateBestLift(modern.squat1, modern.squat2, modern.squat3)
      bestBench = calculateBestLift(modern.bench1, modern.bench2, modern.bench3)
      bestDeadlift = calculateBestLift(modern.deadlift1, modern.deadlift2, modern.deadlift3)
      
      // Add missing legacy fields for raw results
      baseResult.bestSquat = bestSquat
      baseResult.bestBench = bestBench
      baseResult.bestDeadlift = bestDeadlift
    }
    
    // Calculate total
    const lifts = [bestSquat, bestBench, bestDeadlift].filter(v => v !== null) as number[]
    const total = lifts.length > 0 ? lifts.reduce((sum, lift) => sum + lift, 0) : null
    
    // Calculate GL points
    const bodyWeight = raw.bodyWeight
    const gl = total !== null && bodyWeight !== null 
      ? calculateGLPointsRaw(total, bodyWeight, raw.sex)
      : null
    
    return {
      ...baseResult,
      bestSquat: baseResult.bestSquat ?? bestSquat,
      bestBench: baseResult.bestBench ?? bestBench,
      bestDeadlift: baseResult.bestDeadlift ?? bestDeadlift,
      total,
      gl,
      placement: 0 // Will be calculated in next step
    } as Result
  })
  
  // Step 2: Group by meet, sex, weight class, division and calculate placements
  const grouped = new Map<string, typeof resultsWithTotals>()
  
  for (const result of resultsWithTotals) {
    const key = `${result.meetId}-${result.sex}-${result.weightClass}-${result.division}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(result)
  }
  
  // Step 3: Sort each group and assign placements
  for (const group of grouped.values()) {
    // Check disqualification for each result
    for (const result of group) {
      if (isDisqualified(
        result.bestSquat,
        result.bestBench,
        result.bestDeadlift,
        result.bodyWeight,
        result.weightClass,
        result.sex,
        result.ranked
      )) {
        result.placement = DISQUALIFIED
      }
    }
    
    // Sort by total (descending), then by bodyweight (ascending), disqualifications last
    group.sort((a, b) => {
      // Disqualified results go to the end
      if (a.placement === DISQUALIFIED && b.placement !== DISQUALIFIED) return 1
      if (a.placement !== DISQUALIFIED && b.placement === DISQUALIFIED) return -1
      if (a.placement === DISQUALIFIED && b.placement === DISQUALIFIED) return 0
      
      // Sort by total (descending)
      if (a.total !== null && b.total !== null) {
        if (a.total !== b.total) return b.total - a.total
      } else if (a.total !== null) return -1
      else if (b.total !== null) return 1
      
      // If totals are equal or both null, sort by bodyweight (ascending - lighter is better)
      if (a.bodyWeight !== null && b.bodyWeight !== null) {
        return a.bodyWeight - b.bodyWeight
      } else if (a.bodyWeight !== null) return -1
      else if (b.bodyWeight !== null) return 1
      
      return 0
    })
    
    // Assign placements (skip disqualified)
    let placement = 1
    for (const result of group) {
      if (result.placement !== DISQUALIFIED) {
        result.placement = placement++
      }
    }
  }
  
  // Step 4: Return results
  return resultsWithTotals
}

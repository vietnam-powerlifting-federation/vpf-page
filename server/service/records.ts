import { RECORD_START_YEAR } from "~/lib/constants/constants"
import { buildAttemptEvents, getBestAttempt, getRunningTotals, getTargetDivisions } from "~/lib/utils/queries/records"
import { getLatestNationalYear } from "~/server/repository/meets"
import { getNationalResultsDataset, RECORDS_CACHE_PREFIX } from "~/server/repository/records"
import { cacheKey, redisDelByPrefix, redisRemember } from "~/server/utils/redis"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"
import type { Result } from "~/types/results"
import type { UserPublic, UserPublicWithDecorators } from "~/types/users"

/**
 * Records are derived, not stored: every one of them is recomputed by walking the
 * full history of national attempts. That is why they are cached here rather than
 * in the repository, and why a single new result invalidates all of them — a lift
 * in one year changes which records were standing in every later year.
 *
 * Keys are `vpf:records:<year>`, `vpf:records:latest` and `vpf:records:<vpfId>`.
 * They share one segment without colliding because a vpfId is always prefixed
 * with letters and a year never is.
 */

export type RecordsForYear = {
  records: LiftRecord[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

export type RecordHistory = {
  records: LiftRecord[]
  meet: MeetPublic | null
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

/** Records standing at the end of `maxYear`, or of the latest year when `null`. */
export async function getRecordsForYear(maxYear: number | null = null): Promise<RecordsForYear> {
  return redisRemember(
    cacheKey("records", maxYear ?? "latest"),
    () => computeRecordsForYear(maxYear),
  )
}

async function computeRecordsForYear(maxYear: number | null): Promise<RecordsForYear> {
  const { meets: allMeets, results, athletes } = await getNationalResultsDataset({
    minYear: RECORD_START_YEAR,
    maxYear,
  })

  if (allMeets.length === 0) {
    return { records: [], meets: [], athletes: [], results: [] }
  }

  const usersMap = new Map<string, UserPublicWithDecorators>()
  athletes.forEach((user) => usersMap.set(user.vpfId, user))

  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach((meet) => meetsMap.set(meet.meetId, meet))

  // Candidates are grouped by sex/division/weight class/lift; the heaviest in each
  // group is the record. `lot` breaks ties so the same result wins every time.
  type RecordCandidate = LiftRecord & { lot: number }
  const grouped = new Map<string, RecordCandidate[]>()

  const addCandidate = (key: string, candidate: RecordCandidate): void => {
    const group = grouped.get(key)
    if (group) group.push(candidate)
    else grouped.set(key, [candidate])
  }

  for (const result of results) {
    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const dob = usersMap.get(result.vpfId)?.dob ?? null
    const targetDivisions = getTargetDivisions(dob, meet.systemYear)
    const lot = result.lot ?? 999

    const lifts = [
      { lift: "squat" as const, best: getBestAttempt(result.squat1, result.squat2, result.squat3) },
      { lift: "bench" as const, best: getBestAttempt(result.bench1, result.bench2, result.bench3) },
      { lift: "deadlift" as const, best: getBestAttempt(result.deadlift1, result.deadlift2, result.deadlift3) },
    ]

    for (const { lift, best } of lifts) {
      if (!best?.weight || best.weight <= 0) continue
      for (const division of targetDivisions) {
        addCandidate(`${result.sex}-${division}-${result.weightClass}-${lift}`, {
          resultId: result.resultId,
          lift,
          attempt: best.attempt,
          recordWeight: best.weight,
          recordDivision: division,
          lot,
        })
      }
    }

    // A total counts as it stood after each deadlift attempt, so an athlete can
    // set the total record on their second attempt and beat it on their third.
    for (const { attempt, weight } of getRunningTotals(result)) {
      if (!weight || weight <= 0) continue
      for (const division of targetDivisions) {
        addCandidate(`${result.sex}-${division}-${result.weightClass}-total`, {
          resultId: result.resultId,
          lift: "total",
          attempt,
          recordWeight: weight,
          recordDivision: division,
          lot,
        })
      }
    }
  }

  const records: LiftRecord[] = []

  for (const candidates of grouped.values()) {
    if (candidates.length === 0) continue

    candidates.sort((a, b) => {
      if (b.recordWeight !== a.recordWeight) return b.recordWeight - a.recordWeight
      if (a.attempt !== b.attempt) return a.attempt - b.attempt
      return a.lot - b.lot
    })

    const { resultId, lift, attempt, recordWeight, recordDivision } = candidates[0]
    records.push({ resultId, lift, attempt, recordWeight, recordDivision })
  }

  return { records, meets: allMeets, athletes: Array.from(usersMap.values()), results }
}

/** Every record one athlete has ever set, each marked as still holding or since broken. */
export async function getAthleteRecordStatus(vpfId: string): Promise<LiftRecord[]> {
  return redisRemember(cacheKey("records", vpfId), () => computeAthleteRecordStatus(vpfId))
}

async function computeAthleteRecordStatus(targetVpfId: string): Promise<LiftRecord[]> {
  const { meets: allMeets, results, athletes } = await getNationalResultsDataset({
    minYear: RECORD_START_YEAR,
  })

  if (allMeets.length === 0) return []

  const usersMap = new Map<string, UserPublic>()
  athletes.forEach((user) => usersMap.set(user.vpfId, user))

  const meetsMap = new Map<number, MeetPublic>()
  allMeets.forEach((meet) => meetsMap.set(meet.meetId, meet))

  const events = buildAttemptEvents(results, meetsMap)
  events.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.liftOrder !== b.liftOrder) return a.liftOrder - b.liftOrder
    if (a.attempt !== b.attempt) return a.attempt - b.attempt
    if (a.weight !== b.weight) return a.weight - b.weight
    return a.lot - b.lot
  })

  // Walking the attempts in chronological order means every record is created as
  // "holding" and demoted to "broken" the moment a later attempt passes it.
  type RecordEntry = LiftRecord & { vpfId: string }
  const groupBest = new Map<string, { weight: number; entry: RecordEntry }>()
  const allRecords: RecordEntry[] = []
  const processed = new Set<string>()

  for (const event of events) {
    const { result, lift, attempt, weight } = event
    if (weight <= 0) continue

    const eventKey = `${result.vpfId}-${lift}-${attempt}-${weight}`
    if (processed.has(eventKey)) continue
    processed.add(eventKey)

    const meet = meetsMap.get(result.meetId)
    if (!meet) continue

    const dob = usersMap.get(result.vpfId)?.dob ?? null

    for (const division of getTargetDivisions(dob, meet.systemYear)) {
      const key = `${result.sex}-${division}-${result.weightClass}-${lift}`
      const previous = groupBest.get(key)
      if (weight <= (previous?.weight ?? 0)) continue

      if (previous) previous.entry.status = "broken"

      const entry: RecordEntry = {
        resultId: result.resultId,
        lift,
        attempt,
        recordWeight: weight,
        recordDivision: division,
        status: "holding",
        vpfId: result.vpfId,
      }
      groupBest.set(key, { weight, entry })
      allRecords.push(entry)
    }
  }

  return allRecords
    .filter((record) => record.vpfId === targetVpfId)
    .map(({ vpfId: _vpfId, ...record }) => record)
}

/**
 * The records set during one year's national meet, in the order they fell.
 *
 * Unlike `getRecordsForYear`, which reports what stands at the end of a year,
 * this replays the meet attempt by attempt against the records carried in from
 * the previous year — so a bar that is raised three times in one session appears
 * three times.
 */
export async function getRecordHistory(requestedYear: number | null): Promise<RecordHistory> {
  const latestYear = await getLatestNationalYear()
  if (latestYear === null) {
    return { records: [], meet: null, athletes: [], results: [] }
  }

  const year = requestedYear === null || requestedYear > latestYear ? latestYear : requestedYear

  const { records: previousRecords, results: previousResults } = await getRecordsForYear(year - 1)

  const previousResultsById = new Map(previousResults.map((result) => [result.resultId, result]))
  const standingRecords = new Map<string, number>()

  for (const record of previousRecords) {
    const result = previousResultsById.get(record.resultId)
    if (!result) continue
    standingRecords.set(
      `${result.sex}-${record.recordDivision}-${result.weightClass}-${record.lift}`,
      record.recordWeight,
    )
  }

  const { meets: yearMeets, results, athletes } = await getNationalResultsDataset({
    minYear: year,
    maxYear: year,
  })

  const meet = yearMeets[0] ?? null
  if (!meet) return { records: [], meet: null, athletes: [], results: [] }

  const usersMap = new Map<string, UserPublicWithDecorators>()
  athletes.forEach((user) => usersMap.set(user.vpfId, user))

  const events = buildAttemptEvents(results, new Map([[meet.meetId, meet]]))
  events.sort((a, b) => {
    if (a.liftOrder !== b.liftOrder) return a.liftOrder - b.liftOrder
    if (a.attempt !== b.attempt) return a.attempt - b.attempt
    if (a.weight !== b.weight) return a.weight - b.weight
    return a.lot - b.lot
  })

  const records: LiftRecord[] = []
  const groupBest = new Map<string, number>()
  const processed = new Set<string>()

  for (const event of events) {
    const { result, lift, attempt, weight } = event
    if (weight <= 0) continue

    const eventKey = `${result.vpfId}-${lift}-${attempt}-${weight}`
    if (processed.has(eventKey)) continue
    processed.add(eventKey)

    const dob = usersMap.get(result.vpfId)?.dob ?? null

    for (const division of getTargetDivisions(dob, meet.systemYear)) {
      const key = `${result.sex}-${division}-${result.weightClass}-${lift}`
      const best = groupBest.get(key) ?? standingRecords.get(key) ?? 0
      if (weight <= best) continue

      records.push({
        resultId: result.resultId,
        lift,
        attempt,
        recordWeight: weight,
        recordDivision: division,
      })
      groupBest.set(key, weight)
    }
  }

  return { records, meet, athletes: Array.from(usersMap.values()), results }
}

/** Drop every cached record and record dataset. Returns the number of keys removed. */
export async function invalidateRecords(): Promise<number> {
  return redisDelByPrefix(RECORDS_CACHE_PREFIX)
}

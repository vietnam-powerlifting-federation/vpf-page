import { fetchRecordsForYear, fetchAthleteRecordStatus } from "~/lib/utils/queries/records"

const ONE_DAY = 60 * 60 * 24

export const cachedFetchRecordsForYear = defineCachedFunction(
  fetchRecordsForYear,
  {
    maxAge: ONE_DAY,
    name: "records-for-year",
    getKey: (options) => String(options?.maxYear ?? "latest"),
  }
)

export const cachedFetchAthleteRecordStatus = defineCachedFunction(
  fetchAthleteRecordStatus,
  {
    maxAge: ONE_DAY,
    name: "athlete-record-status",
    getKey: (vpfId) => vpfId,
  }
)

/**
 * Nitro stores `defineCachedFunction` entries under `nitro:functions:<name>:<key>`
 * and `defineCachedEventHandler` entries under `nitro:handlers:<name>:<key>`.
 */
const CACHED_FUNCTION_PREFIXES = ["nitro:functions:records-for-year", "nitro:functions:athlete-record-status"]
const MEET_DETAILS_PREFIX = "nitro:handlers:meet-details"

async function dropByPrefix(prefixes: string[]): Promise<number> {
  const storage = useStorage("cache")
  let removed = 0
  for (const prefix of prefixes) {
    const keys = await storage.getKeys(prefix)
    await Promise.all(keys.map((key) => storage.removeItem(key)))
    removed += keys.length
  }
  return removed
}

/**
 * Drop the cached meet-detail responses after a results import.
 *
 * `/api/meets/[id]` caches itself for ten minutes and is keyed on the router
 * param, so one meet can sit in the cache under both its numeric id and its slug.
 * Every entry is dropped rather than the two guessed keys — importing is rare,
 * and a meet page that still shows no results after an import is exactly the
 * confusion §3.6 exists to prevent.
 */
export async function invalidateMeetDetailsCache(): Promise<number> {
  return dropByPrefix([MEET_DETAILS_PREFIX])
}

/**
 * Drop the cached records so a results import is visible immediately (§3.6).
 *
 * Both caches hold for a day, so without this an admin imports, sees the records
 * page unchanged, and imports again. Every entry is dropped rather than just the
 * affected year: `fetchRecordsForYear` walks history to decide which records still
 * stand, so a new result in 2026 can change what 2027 reports.
 *
 * Note this clears the *server* cache only — `/api/records` also sends
 * `Cache-Control: max-age=86400`, so a browser that already has the response keeps
 * it until that expires.
 */
export async function invalidateRecordsCache(): Promise<number> {
  return dropByPrefix(CACHED_FUNCTION_PREFIXES)
}

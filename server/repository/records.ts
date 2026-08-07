import { RECORD_START_YEAR } from "~/lib/constants/constants"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { cacheKey, redisRemember } from "~/server/utils/redis"
import type { ResultsDataset } from "~/server/repository/results"

/** Cache namespace owned by this repository; services invalidate through it. */
export const RECORDS_CACHE_PREFIX = "vpf:records"

type NationalResultsOptions = {
  minYear?: number
  maxYear?: number | null
}

/**
 * Results from visible, non-legacy national meets — the only meets a record can
 * be set at, and therefore the input every record computation starts from.
 *
 * Kept separate from the general results dataset because the record pages read it
 * by year range: `/api/records` asks for everything up to a year, and the history
 * page asks for the year before that to work out which records were standing.
 */
export async function getNationalResultsDataset(
  options: NationalResultsOptions = {},
): Promise<ResultsDataset> {
  const { minYear = RECORD_START_YEAR, maxYear = null } = options
  const boundedMaxYear = maxYear !== null && !isNaN(maxYear) ? maxYear : undefined

  return redisRemember(
    cacheKey("records", "dataset", { minYear, maxYear: boundedMaxYear ?? "latest" }),
    () => getMeetsAndResultsAndAthletes({
      meetType: ["national"],
      legacy: false,
      hidden: false,
      minYear,
      maxYear: boundedMaxYear,
    }),
  )
}

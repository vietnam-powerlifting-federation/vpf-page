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

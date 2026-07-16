# Powerlifting domain rules

The rules of the sport are encoded in [lib/constants/constants.ts](../lib/constants/constants.ts) and [lib/utils/meet-result.ts](../lib/utils/meet-result.ts). Reuse them rather than re-deriving.

## Weight classes

Male `[53, 59, 66, 74, 83, 93, 105, 120, 999]`, female `[43, 47, 52, 57, 63, 69, 76, 84, 999]`. `999` is the unlimited class and renders as "120+kg" (male) or "84+kg" (female) — see `formatWeightClass` in [lib/utils/client.ts](../lib/utils/client.ts). A database check constraint enforces the class/sex pairing.

## Divisions

`subjr`, `jr`, `open`, `mas1`–`mas4`, `guest`. `guest` is never ranked (`RANKED_DIVISION` excludes it). Division is derived from age — birth *year* against the meet's `systemYear`.

For records, a lift counts toward several divisions at once via `RECORD_DIVISION_OVERRIDE`: a `subjr` lift also stands as `jr` and `open`; a `mas3` lift also stands as `mas2`, `mas1`, and `open`.

## Disqualification

`DISQUALIFIED = 99`, used as the placement sentinel. It is computed, never stored. A result is disqualified when:

- any of the three best lifts is null or 0, or
- bodyweight falls outside the entered weight class (must be greater than the previous class and at most the entered class), or
- `ranked === false`.

## Total and GL points

Total is the sum of the three best lifts. GL points come from `calculateGLPointsRaw(totalKg, bodyweightKg, sex)` with sex-specific coefficients. Both are computed in `meet-result.ts` (`addMetadataToMeetResults`) and are **not** columns in the database.

## National records

`RECORD_START_YEAR = 2022` — only meets from that year onward count. The logic in [lib/utils/queries/records.ts](../lib/utils/queries/records.ts) reconstructs the attempt-by-attempt timeline (`buildAttemptEvents`, `getRunningTotals`) so a record can be attributed to the exact attempt that set it.

`fetchRecordsForYear` and `fetchAthleteRecordStatus` are wrapped in Nitro's `defineCachedFunction` with a one-day TTL in [server/utils/cached-records.ts](../server/utils/cached-records.ts). API handlers should call the cached wrappers, not the raw query functions.

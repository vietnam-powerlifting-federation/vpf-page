import { logger } from "~/lib/logger/logger"
import { invalidateMeets } from "~/server/service/meets"
import { invalidateRecords } from "~/server/service/records"
import { invalidateResults } from "~/server/service/results"

/**
 * Drop every cached public dataset.
 *
 * Cached resources expire on their own after a day (`CACHE_TTL_SECONDS`), so
 * this is not how the cache normally stays correct — it exists for the two cases
 * where waiting out the day is unacceptable:
 *
 *   - a confirmed results import, where a records page that has not moved makes
 *     an admin import a second time
 *   - the admin's manual clear button, for when the data was fixed by hand
 *
 * Deliberately not called from the other write paths. Invalidating from every
 * endpoint that touches a meet or an athlete means every *future* endpoint is a
 * chance to forget one, and a forgotten invalidation is indistinguishable from a
 * caching bug. The TTL bounds the damage instead.
 *
 * All three resources go together: results are computed from meets, records from
 * results, and each embeds the athletes appearing in it.
 */
export async function invalidatePublicData(reason: string): Promise<number> {
  const [meets, records, results] = await Promise.all([
    invalidateMeets(),
    invalidateRecords(),
    invalidateResults(),
  ])

  const cleared = meets + records + results
  logger.info("Public data cache invalidated", { reason, cleared, meets, records, results })

  return cleared
}

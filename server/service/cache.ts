import { logger } from "~/lib/logger/logger"
import { userPublicSelect } from "~/lib/utils/queries/users"
import { invalidateMeets } from "~/server/service/meets"
import { invalidateRecords } from "~/server/service/records"
import { invalidateResults } from "~/server/service/results"

/**
 * Drop every cached public dataset after a write.
 *
 * The three resources are not independent: results are computed from meets,
 * records are computed from results, and all of them embed the athletes who
 * appear in them. Any write that touches a meet, a result or an athlete's public
 * details can therefore change all three, and a partial invalidation leaves one
 * page contradicting another.
 *
 * These writes are rare admin actions — an import, a meet edit, a verification
 * approval — so invalidating broadly costs one cold rebuild, while invalidating
 * narrowly risks a records page that stays wrong until someone notices.
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

/**
 * Derived from `userPublicSelect` so the two cannot drift: whatever a cached
 * response exposes about an athlete is exactly what has to invalidate it.
 */
const PUBLIC_ATHLETE_FIELDS = new Set(Object.keys(userPublicSelect))

/**
 * Whether an athlete patch changes anything the cached pages actually show.
 *
 * Athletes edit their own profiles far more often than admins import results,
 * and most of what they edit — phone number, address, rack pins — appears
 * nowhere public. Only a change to a public field needs to clear the cache.
 * `dob` counts twice over: it decides which age divisions a lift sets a record
 * in, so editing it rewrites records rather than just a displayed name.
 */
export function touchesPublicAthleteFields(patch: object): boolean {
  return Object.keys(patch).some((field) => PUBLIC_ATHLETE_FIELDS.has(field))
}

import { logger } from "~/lib/logger/logger"
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

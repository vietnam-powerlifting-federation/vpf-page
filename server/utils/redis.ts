import Redis from "ioredis"
import { logger } from "~/lib/logger/logger"

/**
 * Shared Redis cache for the expensive public reads (meets, records, results).
 *
 * Read straight from `process.env` rather than `lib/config/config.ts` or
 * `runtimeConfig`: this module is server-only, and unlike the rest of the config
 * a missing `REDIS_URL` must not be fatal — the site has to keep serving from the
 * database when the cache is unavailable.
 */

/** Escape hatch for local development: run against the database with no cache at all. */
const cacheDisabled = process.env.CACHE_DISABLED === "true"

let client: Redis | null = null
let unavailableLogged = false

/**
 * The cache is an optimisation, never a dependency, so every helper below fails
 * open. `null` here means "no cache this request" and callers fall through to the
 * underlying query.
 */
export function getRedis(): Redis | null {
  if (cacheDisabled) return null
  if (client) return client

  const url = process.env.REDIS_URL
  if (!url) {
    if (!unavailableLogged) {
      logger.warn("REDIS_URL is not set; serving every request uncached")
      unavailableLogged = true
    }
    return null
  }

  client = new Redis(url, {
    // Defaults queue commands while disconnected and retry forever, which turns a
    // Redis outage into hanging requests. Fail the command instead so the caller
    // falls through to the database immediately.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  })

  // ioredis emits `error` on every reconnect attempt; an unhandled one takes the
  // process down, so this listener is required, not diagnostic garnish.
  client.on("error", (error: Error) => {
    logger.warn("Redis connection error", { error: error.message })
  })

  return client
}

/**
 * `vpf:<resource>:<id>:<query>` — the `vpf:` namespace lets this share a Redis
 * instance without collisions and makes `SCAN vpf:*` cheap. Empty segments are
 * dropped so a key without a query is a clean prefix of one with it, which is
 * what makes `redisDelByPrefix` able to drop a whole resource.
 */
export function cacheKey(resource: string, id?: string | number, query?: Record<string, unknown>): string {
  const segments: string[] = ["vpf", resource]
  if (id !== undefined && id !== null && id !== "") segments.push(String(id))
  const serialized = query && serializeQuery(query)
  if (serialized) segments.push(serialized)
  return segments.join(":")
}

/** Key order in an object is not guaranteed, so sort to keep one query one key. */
function serializeQuery(query: Record<string, unknown>): string {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : String(value)}`)
  return parts.join("&")
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const raw = await redis.get(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch (error) {
    logger.warn("Redis read failed", { key, error: (error as Error).message })
    return null
  }
}

/**
 * Without `ttlSeconds` the entry is held indefinitely and only leaves on an
 * explicit invalidation — which is why the instance must run `noeviction`.
 */
export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const raw = JSON.stringify(value)
    if (ttlSeconds === undefined) {
      await redis.set(key, raw)
    } else {
      await redis.set(key, raw, "EX", ttlSeconds)
    }
  } catch (error) {
    logger.warn("Redis write failed", { key, error: (error as Error).message })
  }
}

export async function redisDel(...keys: string[]): Promise<number> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return 0

  try {
    return await redis.unlink(...keys)
  } catch (error) {
    logger.warn("Redis delete failed", { keys, error: (error as Error).message })
    return 0
  }
}

/**
 * Drop every key under a prefix, e.g. all of `vpf:records`.
 *
 * `SCAN` rather than `KEYS` because `KEYS` blocks the server for the length of
 * the keyspace, and invalidation runs on admin writes that already feel slow.
 * `UNLINK` frees memory on a background thread for the same reason.
 */
export async function redisDelByPrefix(prefix: string): Promise<number> {
  const redis = getRedis()
  if (!redis) return 0

  try {
    let cursor = "0"
    let removed = 0

    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200)
      cursor = nextCursor
      if (keys.length > 0) removed += await redis.unlink(...keys)
    } while (cursor !== "0")

    return removed
  } catch (error) {
    logger.warn("Redis prefix delete failed", { prefix, error: (error as Error).message })
    return 0
  }
}

/**
 * Read-through cache around an expensive query. A miss, a cache outage and a
 * `CACHE_DISABLED` run all take the same path: call `fetch` and return it.
 *
 * `null` is not cached. A stored `null` is indistinguishable from a miss on read,
 * so caching it would mean writing the key back on every request that hits it —
 * "not found" simply stays uncached.
 */
export async function redisRemember<T>(key: string, fetch: () => Promise<T>, ttlSeconds?: number): Promise<T> {
  const cached = await redisGet<T>(key)
  if (cached !== null) return cached

  const value = await fetch()
  if (value !== null) await redisSet(key, value, ttlSeconds)
  return value
}

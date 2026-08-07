import { beforeEach, vi } from "vitest"

/**
 * In-memory stand-in for server/utils/redis.
 *
 * Not merely a passthrough: the real key shapes are kept (the actual `cacheKey`
 * is reused) and reads genuinely hit the store, so a handler that writes without
 * invalidating will serve stale data here exactly as it would in production.
 * That is the point — a missing invalidation is the failure this cache can
 * actually cause, so the tests have to be able to see one.
 *
 * Mocking rather than pointing at a real instance also stops a developer with
 * REDIS_URL in their .env from having the suite read and write their live cache.
 */
const store = new Map<string, string>()

/**
 * The expiry each key was written with, so a test can assert that nothing is
 * cached forever. `undefined` records a write that passed no TTL at all.
 */
const ttls = new Map<string, number | undefined>()

declare global {
  var __vpfRedisMockTtls: Map<string, number | undefined>
}
globalThis.__vpfRedisMockTtls = ttls

vi.mock("~/server/utils/redis", async (importOriginal) => {
  // cacheKey is pure string building and CACHE_TTL_SECONDS is the value under
  // test; reuse both so the mock cannot drift from the real module.
  const { cacheKey, CACHE_TTL_SECONDS } = await importOriginal<typeof import("~/server/utils/redis")>()

  const redisGet = async <T>(key: string): Promise<T | null> => {
    const raw = store.get(key)
    return raw === undefined ? null : (JSON.parse(raw) as T)
  }

  const redisSet = async (key: string, value: unknown, ttlSeconds?: number): Promise<void> => {
    store.set(key, JSON.stringify(value))
    ttls.set(key, ttlSeconds)
  }

  const redisDel = async (...keys: string[]): Promise<number> => {
    let removed = 0
    for (const key of keys) if (store.delete(key)) removed++
    return removed
  }

  const redisDelByPrefix = async (prefix: string): Promise<number> => {
    let removed = 0
    for (const key of [...store.keys()]) {
      if (key.startsWith(prefix) && store.delete(key)) removed++
    }
    return removed
  }

  // Mirrors the real signature, including its default, so a caller that passes no
  // TTL is recorded as having been written with the default rather than with none.
  const redisRemember = async <T>(
    key: string,
    fetch: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL_SECONDS,
  ): Promise<T> => {
    const cached = await redisGet<T>(key)
    if (cached !== null) return cached

    const value = await fetch()
    if (value !== null) await redisSet(key, value, ttlSeconds)
    return value
  }

  return {
    getRedis: () => null,
    cacheKey,
    CACHE_TTL_SECONDS,
    redisGet,
    redisSet,
    redisDel,
    redisDelByPrefix,
    redisRemember,
  }
})

// The database is seeded once for the whole run and tests mutate it as they go,
// so every test starts from a cold cache rather than inheriting the previous
// test's entries.
beforeEach(() => {
  store.clear()
  ttls.clear()
})

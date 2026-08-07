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

vi.mock("~/server/utils/redis", async (importOriginal) => {
  // cacheKey is pure string building; reuse it so the mock cannot drift from the
  // key convention the invalidation prefixes depend on.
  const { cacheKey } = await importOriginal<typeof import("~/server/utils/redis")>()

  const redisGet = async <T>(key: string): Promise<T | null> => {
    const raw = store.get(key)
    return raw === undefined ? null : (JSON.parse(raw) as T)
  }

  const redisSet = async (key: string, value: unknown): Promise<void> => {
    store.set(key, JSON.stringify(value))
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

  const redisRemember = async <T>(key: string, fetch: () => Promise<T>): Promise<T> => {
    const cached = await redisGet<T>(key)
    if (cached !== null) return cached

    const value = await fetch()
    if (value !== null) await redisSet(key, value)
    return value
  }

  return {
    getRedis: () => null,
    cacheKey,
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
})

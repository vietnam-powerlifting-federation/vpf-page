import "dotenv/config"

/**
 * Vitest globalSetup. Returned function runs after all tests (teardown).
 * No setup work here; seed runs in globalDb.ts beforeAll.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  return async function teardown(): Promise<void> {
    await import("dotenv/config")
    process.env.VITEST = "true"
    const { teardownTestDatabase } = await import("./db")
    await teardownTestDatabase()
  }
}

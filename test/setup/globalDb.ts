import { beforeAll } from "vitest"
import {
  runTestDatabaseMigrations,
  seedTestDatabase,
  teardownTestDatabase,
} from "./db"

declare global {
  // eslint-disable-next-line no-var
  var __vpfTestDbSeeded: boolean | undefined
}

// Migrate (create tables), then seed once for the whole run. Cleanup runs in globalSetup teardown.
beforeAll(async () => {
  if (globalThis.__vpfTestDbSeeded) return
  await runTestDatabaseMigrations()
  await teardownTestDatabase()
  await seedTestDatabase()
  globalThis.__vpfTestDbSeeded = true
}, 30000)

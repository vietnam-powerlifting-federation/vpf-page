import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import { defineVitestProject } from "@nuxt/test-utils/config"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  test: {
    maxWorkers: 1,
    projects: [
      await defineVitestProject({
        test: {
          name: "api",
          include: ["test/api/**/*.test.ts"],
          environment: "nuxt",
          setupFiles: [
            "test/setup/env.ts",
            "test/setup/globalDb.ts",
            "test/setup/h3Mock.ts",
            "test/setup/redisMock.ts",
          ],
          globalSetup: "test/setup/globalSetup.ts",
          testTimeout: 15000,
          globals: true,
          hookTimeout: 60000,
        },
      }),
      {
        // Pure functions only — the LiftingCast CSV parser and the two enum
        // mappings. No database and no Nuxt runtime, so these stay fast and run
        // without TEST_DATABASE_URL.
        resolve: {
          alias: { "~": rootDir, "@": rootDir },
        },
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
          globals: true,
        },
      },
    ],
  },
})

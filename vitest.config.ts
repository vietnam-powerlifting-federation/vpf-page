import { defineConfig } from "vitest/config"
import { defineVitestProject } from "@nuxt/test-utils/config"

export default defineConfig({
  test: {
    projects: [
      // API tests: run in node, use e2e setup (build + start server) in each file
      {
        test: {
          name: "api",
          include: ["test/api/**/*.test.ts"],
          environment: "node",
          setupFiles: ["test/setup/env.ts", "test/setup/globalDb.ts", "test/setup/apiServer.ts"],
          globalSetup: "test/setup/globalSetup.ts",
          testTimeout: 60000,
          globals: true,
          hookTimeout: 300000,
          maxWorkers: 1,
        },
      },
      // Other tests (nuxt runtime): component/unit tests
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/**/*.{test,spec}.ts"],
          exclude: ["test/api/**"],
          environment: "nuxt",
          setupFiles: ["test/setup/env.ts", "test/setup/globalDb.ts"],
          globalSetup: "test/setup/globalSetup.ts",
          testTimeout: 15000,
          globals: true,
        },
      }),
    ],
  },
})

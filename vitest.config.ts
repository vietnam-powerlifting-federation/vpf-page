import { defineConfig } from "vitest/config"
import { defineVitestProject } from "@nuxt/test-utils/config"

export default defineConfig({
  test: {
    maxWorkers: 1,
    projects: [
      await defineVitestProject({
        test: {
          name: "api",
          include: ["test/api/**/*.test.ts"],
          environment: "nuxt",
          setupFiles: ["test/setup/env.ts", "test/setup/globalDb.ts", "test/setup/h3Mock.ts"],
          globalSetup: "test/setup/globalSetup.ts",
          testTimeout: 15000,
          globals: true,
          hookTimeout: 60000,
        },
      }),
    ],
  },
})

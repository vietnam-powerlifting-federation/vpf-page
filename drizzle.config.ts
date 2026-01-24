import { defineConfig } from "drizzle-kit"
import "dotenv/config"
import { config } from "./lib/config/config"

export default defineConfig({
  schema: "./lib/external/drizzle/migrations/schema.ts",
  out: "./lib/external/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseURL,
  },
  verbose: true,
  strict: true,
})

import { defineConfig } from "drizzle-kit"
import "dotenv/config"
import { config } from "./lib/config/config"

export default defineConfig({
  schema: "./db/schema/*",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseURL,
  },
  verbose: true,
  strict: true,
})

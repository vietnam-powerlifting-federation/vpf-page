import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { config } from "../config/config"

export const db = drizzle({
  connection: config.databaseURL,
  casing: "camelCase",
})

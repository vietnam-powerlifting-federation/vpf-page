import { sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"

/** A round trip to Postgres, for the health check. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}

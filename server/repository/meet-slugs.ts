import { eq } from "drizzle-orm"
// Relative imports: this query is consumed from the nuxt.config prerender hook,
// which runs before the "~" alias is available, so the whole chain must be alias-free.
import { db } from "../../external/drizzle/drizzle"
import { meets } from "../../external/drizzle/migrations/schema"

export async function getVisibleMeetSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: meets.meetSlug })
    .from(meets)
    .where(eq(meets.hidden, false))
  return rows.map((row) => row.slug)
}

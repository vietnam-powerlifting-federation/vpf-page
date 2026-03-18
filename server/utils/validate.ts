import type { H3Event } from "h3"
import type { z } from "zod"

export async function readZodBody<T>(
  event: H3Event,
  schema: z.ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; issues: unknown }> {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (parsed.success) return { success: true, data: parsed.data }
  return { success: false, issues: parsed.error.issues }
}

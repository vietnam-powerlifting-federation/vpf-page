import { randomUUID } from "node:crypto"
import type { H3Event } from "h3"
import { logger } from "~/lib/logger/logger"
import { fail } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"

/**
 * Wraps an API handler with the failure path every endpoint shares.
 *
 * Handlers return `ApiResponse` for outcomes they anticipate — a 404, a 403, a
 * validation error. This catches the ones they do not, so an unexpected throw
 * becomes a 500 in the same envelope as everything else rather than an h3 error
 * page that no client is written to parse.
 *
 * Previously all 55 handlers repeated this as `try { … } catch { logger.error(…);
 * return fail(event, 500, MSG.internalError) }`. Centralising it removes the
 * copy, and gives every failure a correlation id: the caller is shown a
 * reference, the same reference is in the logs with the method, path and
 * requesting athlete. A user report of "error ref 3f2a…" is now enough to find
 * the stack trace, which a bare "Internal server error" never was.
 */
/**
 * The path, without assuming the full h3 helper surface. This runs on the error
 * path, so it must not be able to throw and mask the error it is reporting.
 */
function requestPath(event: H3Event): string {
  try {
    return event.path ?? getRequestURL(event).pathname
  } catch {
    return "unknown"
  }
}

export function defineApiHandler<T>(handler: (event: H3Event) => Promise<ApiResponse<T>>) {
  return defineEventHandler(async (event): Promise<ApiResponse<T | null>> => {
    try {
      return await handler(event)
    } catch (error) {
      // Short enough to read back over the phone, long enough not to collide.
      const errorId = randomUUID().slice(0, 8)

      logger.error("Unhandled API error", {
        errorId,
        method: event.method,
        path: requestPath(event),
        vpfId: event.context.user?.vpfId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return fail(event, 500, {
        en: `Internal server error (ref ${errorId})`,
        vi: `Lỗi máy chủ (mã ${errorId})`,
      })
    }
  })
}

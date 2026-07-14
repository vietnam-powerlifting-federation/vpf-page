import type { H3Event } from "h3"
import type { JwtPayload } from "~/lib/utils/jwt"
import { fail, type I18nMessage } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"

type GuardResult =
  | { ok: true; user: JwtPayload }
  | { ok: false; error: ApiResponse<never> }

/**
 * Ensures the request is authenticated. On success returns the authenticated
 * user; otherwise returns a 401 response to return directly from the handler.
 *
 *   const auth = requireUser(event)
 *   if (!auth.ok) return auth.error
 *   const { user } = auth
 */
export function requireUser(event: H3Event): GuardResult {
  const user = event.context.user
  if (!user?.vpfId) {
    return { ok: false, error: fail(event, 401, MSG.unauthorized) }
  }
  return { ok: true, user }
}

/**
 * Ensures the request is authenticated and the user is an admin. Pass a
 * context-specific `forbidden` message for the 403 case.
 */
export function requireAdmin(event: H3Event, forbidden: I18nMessage = MSG.adminOnly): GuardResult {
  const auth = requireUser(event)
  if (!auth.ok) return auth
  if (auth.user.role !== "admin") {
    return { ok: false, error: fail(event, 403, forbidden) }
  }
  return auth
}

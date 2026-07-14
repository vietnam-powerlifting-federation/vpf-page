import type { H3Event } from "h3"
import { setCookie } from "h3"

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/**
 * Set the auth-token httpOnly cookie. No-ops in unit tests where `event.node.res`
 * is a minimal stub that does not support cookie helpers.
 */
export function setAuthCookie(event: H3Event, token: string): void {
  const isSecure = process.env.NODE_ENV === "production"
  const res = (event as unknown as { node?: { res?: unknown } }).node?.res as { getHeader?: unknown } | undefined
  if (typeof res?.getHeader !== "function") return
  setCookie(event, "auth-token", token, {
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: isSecure,
    sameSite: "strict",
    httpOnly: true,
    path: "/",
  })
}

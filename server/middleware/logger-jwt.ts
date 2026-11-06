import { logger } from "~/lib/logger/logger"
import { verifyToken } from "~/lib/external/jwt"
import { httpRequestDuration, routeLabel } from "~/server/utils/metrics"

// Scraped every 15 seconds; logging and timing it would only drown out real traffic.
const METRICS_PATH = "/api/metrics"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const method = event.method
  const path = url.pathname

  const startTime = performance.now()
  const userAgent = getHeader(event, "user-agent") || "unknown"
  // Get client IP from headers or request socket
  const forwardedFor = getHeader(event, "x-forwarded-for")
  const realIp = getHeader(event, "x-real-ip")
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || event.node.req.socket.remoteAddress || "unknown"

  // Extract token from Authorization header
  const authHeader = getHeader(event, "authorization")
  let token: string | null = null

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7)
  }

  // If no token in header, try to get from cookie
  if (!token) {
    token = getCookie(event, "auth-token") || null
  }

  // Verify the token and attach credentials (null if no token or invalid)
  const payload = token ? verifyToken(token) : null

  // Attach user info to event context (null if no valid token)
  event.context.user = payload || null

  if (payload) {
    logger.debug("JWT verified successfully", {
      method,
      path,
      userId: payload.userId,
      vpfId: payload.vpfId,
      ip,
    })
  } else if (token) {
    logger.debug("Invalid or expired JWT token", {
      method,
      path,
      ip,
    })
  }

  if (path === METRICS_PATH) return

  // One line per request, written once the response is done so it carries the
  // outcome. `matchedRoute` is only set after this middleware, by the router.
  event.node.res.on("finish", () => {
    const durationMs = Math.round(performance.now() - startTime)
    const statusCode = event.node.res.statusCode
    const route = routeLabel(event.context.matchedRoute?.path)

    httpRequestDuration.observe({ method, route, status: String(statusCode) }, durationMs / 1000)

    logger.http("Request completed", {
      method,
      path,
      route,
      statusCode,
      durationMs,
      userId: payload?.userId,
      userAgent,
      ip,
    })
  })
})

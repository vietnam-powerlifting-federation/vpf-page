import { logger } from "~/lib/logger/logger"
import { verifyToken } from "~/lib/utils/jwt"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const method = event.method
  const path = url.pathname

  // Log the request
  const startTime = Date.now()
  const userAgent = getHeader(event, "user-agent") || "unknown"
  // Get client IP from headers or request socket
  const forwardedFor = getHeader(event, "x-forwarded-for")
  const realIp = getHeader(event, "x-real-ip")
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || event.node.req.socket.remoteAddress || "unknown"

  logger.http("Incoming request", {
    method,
    path,
    userAgent,
    ip,
  })

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

  // Log response time after the request is handled
  event.node.res.on("finish", () => {
    const duration = Date.now() - startTime
    const statusCode = event.node.res.statusCode

    logger.http("Request completed", {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
    })
  })
})

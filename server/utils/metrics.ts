import { createHash, timingSafeEqual } from "node:crypto"
import { Counter, Histogram, Registry, collectDefaultMetrics } from "@prometheus-io/client"

/**
 * Prometheus metrics, scraped from `/api/metrics` by VictoriaMetrics (see
 * monitoring/victoriametrics/scrape.yml).
 *
 * A registry of our own rather than the client's global one, so nothing a
 * dependency registers ends up on the endpoint by accident.
 */
export const metricsRegistry = new Registry()

// Heap, RSS, event-loop lag, GC pauses, open handles.
collectDefaultMetrics({ register: metricsRegistry })

/**
 * Every request, labelled by the route *pattern* (`/api/athletes/:id/profile`),
 * never the raw path: a path carries athlete IDs and slugs, and one series per
 * athlete would grow without bound.
 */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Time from receiving a request to finishing its response",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
})

/** Read-through cache lookups by resource (`meets`, `records`, `results`). */
export const cacheLookups = new Counter({
  name: "cache_lookups_total",
  help: "Read-through cache lookups, by resource and whether they hit",
  labelNames: ["resource", "result"] as const,
  registers: [metricsRegistry],
})

/**
 * Nitro serves public files before route matching, so a request with no matched
 * route is a static file; `/**` is the SSR renderer's catch-all, i.e. a page.
 */
export function routeLabel(matchedPath: string | undefined): string {
  if (!matchedPath) return "static"
  if (matchedPath === "/**") return "page"
  return matchedPath
}

/**
 * Compares digests rather than the strings themselves: `timingSafeEqual` throws
 * on inputs of different lengths, and checking the length first would leak it.
 */
export function isMetricsTokenValid(authorization: string | null | undefined, token: string): boolean {
  const presented = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(presented), digest(token))
}

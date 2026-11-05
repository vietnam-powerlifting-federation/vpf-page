import { config } from "~/lib/config/config"
import { isMetricsTokenValid, metricsRegistry } from "~/server/utils/metrics"

/**
 * Prometheus metrics for VictoriaMetrics to scrape.
 *
 * Plain text in the exposition format rather than the `ApiResponse` envelope,
 * since a scraper is the only reader. Behind a bearer token because the app's
 * port is public: with `METRICS_TOKEN` unset the endpoint does not exist.
 */
export default defineEventHandler(async (event) => {
  const token = config.metricsToken
  if (!token) {
    setResponseStatus(event, 404)
    return "Not found"
  }

  if (!isMetricsTokenValid(getRequestHeader(event, "authorization"), token)) {
    setResponseStatus(event, 401)
    return "Unauthorized"
  }

  setHeader(event, "content-type", metricsRegistry.contentType)
  return metricsRegistry.metrics()
})

import { describe, it, expect, afterEach } from "vitest"
import { createMockH3Event } from "../utils/h3-event"

const TOKEN = "test-metrics-token"

async function importMetrics() {
  return (await import("~/server/api/metrics.get")).default
}

describe("API: metrics", () => {
  afterEach(() => {
    delete process.env.METRICS_TOKEN
  })

  it("does not exist while METRICS_TOKEN is unset", async () => {
    const handler = await importMetrics()
    const res = await handler(createMockH3Event({ headers: { authorization: "Bearer anything" } }))

    expect(res).toBe("Not found")
  })

  it("rejects a missing or wrong token", async () => {
    process.env.METRICS_TOKEN = TOKEN
    const handler = await importMetrics()

    const attempts: Record<string, string>[] = [{}, { authorization: "Bearer wrong" }, { authorization: TOKEN }]
    for (const headers of attempts) {
      expect(await handler(createMockH3Event({ headers }))).toBe("Unauthorized")
    }
  })

  it("serves the registry in Prometheus format to the right token", async () => {
    process.env.METRICS_TOKEN = TOKEN
    const handler = await importMetrics()

    const body = await handler(createMockH3Event({ headers: { authorization: `Bearer ${TOKEN}` } }))

    expect(body).toContain("# TYPE http_request_duration_seconds histogram")
    expect(body).toContain("# TYPE cache_lookups_total counter")
    expect(body).toContain("process_resident_memory_bytes")
  })
})

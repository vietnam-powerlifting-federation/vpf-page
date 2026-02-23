import type { H3Event } from "h3"

export type MockH3EventOptions = {
  body?: unknown
  params?: Record<string, string>
  query?: Record<string, string>
  context?: { user?: { vpfId: string; email: string | null; role: string } }
  method?: string
}

/**
 * Create a mock H3Event for in-process API handler tests.
 * readBody, getRouterParam, getQuery in h3Mock read from this shape.
 */
export function createMockH3Event(partial: MockH3EventOptions = {}): H3Event {
  const context = {
    params: partial.params ?? {},
    query: partial.query ?? {},
    ...partial.context,
  }
  const event = {
    node: {
      req: {
        method: partial.method ?? "GET",
        headers: { "content-type": "application/json" },
        socket: { remoteAddress: "127.0.0.1" },
      },
      res: { statusCode: 200, on: () => {} },
    },
    context,
    _requestBody: partial.body,
    _responseStatus: undefined as number | undefined,
  }
  return event as unknown as H3Event
}

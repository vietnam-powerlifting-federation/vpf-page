import type { H3Event } from "h3"

export type MockMultipartPart = { name: string; data: Buffer; filename?: string; type?: string }

export type MockH3EventOptions = {
  body?: unknown
  params?: Record<string, string>
  query?: Record<string, string>
  context?: { user?: { vpfId: string; email: string | null; role: string } }
  method?: string
  /** When set, the event is treated as multipart and readMultipartFormData returns these parts. */
  multipart?: MockMultipartPart[]
  headers?: Record<string, string>
}

/**
 * Create a mock H3Event for in-process API handler tests.
 * readBody, readMultipartFormData, getRouterParam, getQuery read from this shape.
 */
export function createMockH3Event(partial: MockH3EventOptions = {}): H3Event {
  const context = {
    params: partial.params ?? {},
    query: partial.query ?? {},
    ...partial.context,
  }
  const headers: Record<string, string> = {
    "content-type": partial.multipart ? "multipart/form-data; boundary=----mock" : "application/json",
    ...partial.headers,
  }
  const event = {
    node: {
      req: {
        method: partial.method ?? "GET",
        headers,
        socket: { remoteAddress: "127.0.0.1" },
      },
      res: { statusCode: 200, on: () => {} },
    },
    context,
    _requestBody: partial.body,
    _multipartData: partial.multipart,
    _responseStatus: undefined as number | undefined,
  }
  return event as unknown as H3Event
}

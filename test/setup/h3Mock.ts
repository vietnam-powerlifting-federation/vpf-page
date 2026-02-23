import type { H3Event } from "h3"
import { vi } from "vitest"

type Handler = (event: H3Event) => Promise<unknown>

/**
 * Stub H3/Nitro globals so server API handlers can be loaded and run in-process.
 * Must run before any handler module is imported (use in setupFiles).
 */
const defineEventHandler = vi.fn((handler: Handler) => handler)
const readBody = vi.fn(async (event: H3Event) => (event as { _requestBody?: unknown })._requestBody)
const getRouterParam = vi.fn((event: H3Event, name: string) => event.context?.params?.[name])
const getQuery = vi.fn((event: H3Event) => event.context?.query ?? {})
const setResponseStatus = vi.fn((event: H3Event, code: number) => {
  const e = event as H3Event & { _responseStatus?: number; node: { res?: { statusCode?: number } } }
  e._responseStatus = code
  if (e.node?.res) e.node.res.statusCode = code
})
const setHeader = vi.fn(() => {})

vi.stubGlobal("defineEventHandler", defineEventHandler)
vi.stubGlobal("readBody", readBody)
vi.stubGlobal("getRouterParam", getRouterParam)
vi.stubGlobal("getQuery", getQuery)
vi.stubGlobal("setResponseStatus", setResponseStatus)
vi.stubGlobal("setHeader", setHeader)

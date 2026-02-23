import { beforeAll } from "vitest"
import { setup } from "@nuxt/test-utils/e2e"

declare global {
  // eslint-disable-next-line no-var
  var __nuxtE2E: Awaited<ReturnType<typeof setup>> | undefined
  // eslint-disable-next-line no-var
  var __nuxtE2EPromise: Promise<Awaited<ReturnType<typeof setup>>> | undefined
}

/**
 * Start Nuxt server once per worker. API tests run in a single worker (maxForks: 1)
 * so this runs once for all api/*.test.ts files. Expose a promise so test files
 * can await it in beforeAll and get $fetch after server is ready.
 */
if (!globalThis.__nuxtE2EPromise) {
  globalThis.__nuxtE2EPromise = (async () => {
    const ctx = await setup({ server: true })
    globalThis.__nuxtE2E = ctx
    return ctx
  })()
}
beforeAll(async () => {
  await globalThis.__nuxtE2EPromise
}, 180000)

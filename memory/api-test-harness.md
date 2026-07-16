# API test harness

The only test suite is [test/api/](../test/api/) (Vitest project `api`, run with `npm test` or `npm run test:api`). Server tests are the tests — component and page tests are explicitly skipped — and any API change must come with an update to `test/api/`.

The setup is not a normal HTTP integration harness, and the differences matter before writing a test.

## Handlers are called directly, not fetched

```ts
const handler = (await import("~/server/api/auth/login.post")).default
const event = createMockH3Event({ body: { email, password }, method: "POST" })
const res = await handler(event)
```

Import inside the test body, not at module top level, because the H3 globals must be stubbed first.

## H3 globals are stubbed

[test/setup/h3Mock.ts](../test/setup/h3Mock.ts) stubs the Nitro auto-imports (`defineEventHandler`, `readBody`, `getRouterParam`, `getQuery`, `setResponseStatus`, `getRequestHeader`, `defineCachedFunction`, and others) as globals. Two consequences:

- **A handler that uses an H3 global not stubbed there will fail** — add it to `h3Mock.ts`.
- `defineCachedFunction` is replaced by the identity function, so Nitro caching is bypassed in tests.

The event is a hand-built object from `createMockH3Event({ body, params, query, context: { user }, method })` ([test/utils/h3-event.ts](../test/utils/h3-event.ts)). Authentication is simulated by putting the user straight into `context.user`, or by minting a token with `createTestToken` ([test/utils/auth.ts](../test/utils/auth.ts)) — not by sending a cookie.

## A real database, shared across tests

Tests run against a real Postgres at `TEST_DATABASE_URL`, which is required: [lib/config/config.ts](../lib/config/config.ts) throws without it when `VITEST` is set. [test/setup/globalDb.ts](../test/setup/globalDb.ts) migrates, wipes, and seeds once per run from [test/fixtures/data.ts](../test/fixtures/data.ts); teardown drops the data.

`maxWorkers: 1` because the database is shared state. Tests that mutate rows must restore them — see the `resetTempUser` pattern in [test/api/auth.test.ts](../test/api/auth.test.ts).

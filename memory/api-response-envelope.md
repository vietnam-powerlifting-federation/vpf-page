# API response envelope

Every endpoint in [server/api/](../server/api/) returns `ApiResponse<T>` ([types/api.ts](../types/api.ts)):

```ts
{ success: boolean, data: T | null, message: { en: string, vi: string } }
```

Handlers **do not throw `createError`**. They build responses with `ok(data, message)` and `fail(event, status, message)` from [server/utils/api-response.ts](../server/utils/api-response.ts). `fail` sets the HTTP status through `setResponseStatus` and returns `data: null`, so the body shape stays uniform for both success and error.

## Conventions that go with it

- The handler body is wrapped in `try/catch`; the catch logs through `logger` and returns `fail(event, 500, MSG.internalError)`.
- Messages shared by **two or more** handlers live in `MSG` ([server/utils/messages.ts](../server/utils/messages.ts)). Single-use messages are written inline at the call site as `{ en: "...", vi: "..." }`. Both languages are always required.
- Body validation uses Zod, usually through `readZodBody(event, Schema)` ([server/utils/validate.ts](../server/utils/validate.ts)), which returns a discriminated result rather than throwing. Schemas shared with the frontend live in [lib/zod/schemas/](../lib/zod/schemas/).
- The frontend reads the message in the active locale with the `useApiMessage()` composable ([composables/useApiMessage.ts](../composables/useApiMessage.ts)) — never by indexing `message.en` directly.
- [server/api/[...].ts](../server/api/%5B...%5D.ts) is a catch-all that logs and returns a 404 in the same envelope, so unknown endpoints still come back well-formed.

Because the envelope is the contract, changing a handler's `data` shape means updating both `test/api/*` and every frontend consumer.

# Auth and guards

Authentication is a JWT ([lib/utils/jwt.ts](../lib/utils/jwt.ts), payload `{ vpfId, email, role }`) delivered as an **httpOnly cookie named `auth-token`**, and also accepted as an `Authorization: Bearer` header.

## Server side

[server/middleware/logger-jwt.ts](../server/middleware/logger-jwt.ts) runs on every request: it logs the request, verifies the token, and attaches the payload to `event.context.user` (typed in [types/h3.d.ts](../types/h3.d.ts)), or `null` when the token is missing or invalid. It never rejects — gating is the handler's job:

```ts
const auth = requireUser(event)      // or requireAdmin(event)
if (!auth.ok) return auth.error      // pre-built 401/403 ApiResponse
const currentUser = auth.user
```

`requireUser` and `requireAdmin` live in [server/utils/auth-guard.ts](../server/utils/auth-guard.ts) and return a result object rather than throwing. `setAuthCookie` ([server/utils/auth-cookie.ts](../server/utils/auth-cookie.ts)) writes the cookie and deliberately no-ops when `event.node.res` is the test stub.

## Client side

The cookie is httpOnly and unreadable from JavaScript, so route middleware [middleware/auth.ts](../middleware/auth.ts) and [middleware/admin.ts](../middleware/admin.ts) verify by fetching `/api/auth/session` (forwarding the cookie header during SSR). They redirect to `/login?to=...` when unauthenticated, and `admin.ts` redirects to `/openvpf` when the role is not `admin`.

## Account flows

Register, email verification by code, resend verification, login, logout, and forgot/reset password by emailed code are all implemented under [server/api/auth/](../server/api/auth/). Email verification can be bypassed in development with `EMAIL_VERIFICATION_SKIP=true` — see [config and env](config-and-env.md).

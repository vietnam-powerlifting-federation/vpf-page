# Project knowledge

Notes on how this codebase works — the conventions and gotchas that are not obvious from a directory listing. Coding rules live in [CLAUDE.md](../CLAUDE.md); these documents explain the architecture behind them.

| Document | What it covers |
| --- | --- |
| [Project overview](project-overview.md) | What the app is, its two halves, and the layer boundaries |
| [API response envelope](api-response-envelope.md) | `ApiResponse`, `ok()`/`fail()`, bilingual messages, Zod validation |
| [Auth and guards](auth-and-guards.md) | JWT cookie, `event.context.user`, `requireUser`/`requireAdmin`, route middleware |
| [Database and Drizzle](database-and-drizzle.md) | Schema, tables, generated SQL, the query layer |
| [API test harness](api-test-harness.md) | In-process handler tests, stubbed H3 globals, the seeded test database |
| [Powerlifting domain rules](powerlifting-domain-rules.md) | Weight classes, divisions, disqualification, GL points, records |
| [VIP purchase flow](vip-purchase-flow.md) | VietQR transfer, SePay webhook, membership activation, R2 uploads |
| [Registration & identity verification](identity-verification.md) | Account lifecycle: signup, email verify, CCCD submission, admin review, the `identityVerified` flag |
| [Competition registration flow](competition-registration-flow.md) | Registration wizard spec: identity gate, ban-list checks, capacity, add-ons, payment |
| [Frontend conventions](frontend-conventions.md) | PrimeVue theme, Tailwind usage, i18n, data-fetching composables |
| [Config fails fast on env](config-and-env.md) | Env vars validated at import time, and what each one gates |

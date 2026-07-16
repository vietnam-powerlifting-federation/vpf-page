# Project overview

`vpf-page` (package name `vpf-data`) is the Vietnam Powerlifting Federation website: a Nuxt 3 app (Vue 3, TypeScript, PrimeVue + Tailwind v4, Pinia, `@nuxtjs/i18n` en/vi) with a Nitro server backed by Postgres via Drizzle ORM.

## Two halves

- **Marketing/content site** — [pages/index.vue](../pages/index.vue), `about`, `membership`, `championships`, `news`, `contact`, plus Nuxt Content markdown under [content/vi/](../content/vi/).
- **`/openvpf`** — the application proper: athlete profiles ([pages/openvpf/athletes/[slug].vue](../pages/openvpf/athletes/%5Bslug%5D.vue)), competitions/meets, national records, athlete self-service (VIP settings, payment history, vouchers, password change), checkout, and an admin identity-verification queue.

A global route middleware, [middleware/openvpf-redirect.global.ts](../middleware/openvpf-redirect.global.ts), 301-redirects every path under `/openvpf` unless it starts with an allowed top-level prefix (`/openvpf`, `/login`, `/register`, `/verify-email`, `/verification`, `/forgot-password`). **Adding a new top-level page means adding its prefix to that list**, otherwise it will be redirected.

## Layer boundaries

Enforced by convention (see [CLAUDE.md](../CLAUDE.md)):

- `types/` — shared TypeScript types. API handlers must not export types.
- `lib/utils/` — database queries and business logic. `lib/utils/queries/` holds the shared read layer.
- `lib/constants/`, `lib/config/`, `lib/zod/schemas/` — domain constants, env config, validation schemas.
- `server/api/` — request handling only.
- `server/utils/` — request-scoped helpers (responses, guards, validation, caching).
- `composables/` — Vue state and data fetching. No plain utility functions here.
- `components/`, `pages/`, `layouts/` — UI, grouped by feature.

"User" and "athlete" are the same entity: the `users` table, keyed by `vpfId`.

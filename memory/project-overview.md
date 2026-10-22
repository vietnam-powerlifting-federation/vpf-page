# Project overview

`vpf-page` (package name `vpf-data`) is the Vietnam Powerlifting Federation website: a Nuxt 3 app (Vue 3, TypeScript, PrimeVue + Tailwind v4, Pinia, `@nuxtjs/i18n` en/vi) with a Nitro server backed by Postgres via Drizzle ORM.

## One app

The marketing site was removed in the 2026 redesign; the application that lived under `/openvpf` is now the whole site at the root: rankings (`/`), national records, competitions and their results, athlete profiles, athlete self-service under `/profile` (VIP settings, payment history, vouchers, password change), checkout, competition registration, the auth pages, and the admin console under `/admin`.

Old `/openvpf/**` links (and `/vi/openvpf/**`) are 301-redirected to the same path at the root by `routeRules` in [nuxt.config.ts](../nuxt.config.ts).

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

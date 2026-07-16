# Frontend conventions

## Styling

Tailwind v4 through the `@tailwindcss/vite` plugin (there is no PostCSS config), plus `tailwindcss-primeui`. The PrimeVue theme is a `definePreset` on **Nora** with a **rose** primary and zinc/neutral surfaces, defined in [nuxt.config.ts](../nuxt.config.ts); dark mode keys off the `.dark` selector.

Write colors as PrimeVue semantic utilities — `text-surface-0`, `bg-surface-800/40`, `border-surface-700`, `text-primary`, `bg-primary text-primary-contrast` — rather than raw Tailwind palette colors, so theming stays coherent. No `@apply`. The `/openvpf` app is designed dark.

## Components

Prefer PrimeVue components (`Button`, `InputText`, `InputNumber`, `Tag`, `Toast`, `ProgressSpinner`, `DataTable`, `Dialog`) over hand-rolled elements; the PrimeVue Nuxt module auto-imports them. Project components are grouped by feature under [components/](../components/): `athletes/`, `meets/`, `profile/`, `checkout/`. Use `<script setup lang="ts">` with `defineProps<{...}>()` throughout.

## i18n is mandatory

English and Vietnamese, files in [i18n/locales/](../i18n/locales/), default locale `en`, Vietnamese routes prefixed `/vi`. Every user-visible string goes through `$t("...")`, so a new string means adding the key to **both** `en.json` and `vi.json`. API messages arrive already bilingual and are read with `useApiMessage()`.

## Data fetching

Feature composables in [composables/](../composables/) wrap `useFetch` with an explicit `key` and a `getCachedData` that reads `nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]`, so SSR-fetched data is not re-fetched on hydration (`useProfileData`, `useMeetData`, `useMeetsList`). They return computed values over `response.data` plus `pending` / `error` / `refresh`, which keeps pages thin.

VIP name and avatar gradients are applied by `useNameDecorators`, which fetches `/api/vip-settings` once into `useState`.

Server-side caching is layered on top through `routeRules` in [nuxt.config.ts](../nuxt.config.ts): 10-minute SWR for `/openvpf/**`, `/api/meets/**`, and `/api/results`.

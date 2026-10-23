# Frontend conventions

The design is "Scoreboard" ([specs/frontend-redesign.md](../specs/frontend-redesign.md)): an always-dark board (header, title bands, table heads) over a page that follows the device theme, with one amber signal colour.

## Styling

Tailwind v4 through the `@tailwindcss/vite` plugin (no PostCSS config), plus `tailwindcss-primeui`. Design tokens are OKLCH CSS variables in [assets/styles/main.css](../assets/styles/main.css), written with `light-dark()` so they follow `color-scheme`, which `@nuxtjs/color-mode` forces with the `.light` / `.dark` class on `<html>`.

The PrimeVue preset ([theme/preset.ts](../theme/preset.ts), on Aura) points every colour at those variables, so a surface step means the same role in both themes. PrimeVue's own dark scheme is therefore off (`darkModeSelector: "none"`). Never write `dark:` pairs for surfaces; use:

- PrimeVue semantic classes where they exist: `bg-surface-0` (panel), `bg-surface-50` (page), `bg-surface-100` (raised/hover), `border-surface-200` (hairline), `border-surface-300` (input border), `text-color`, `text-muted-color`, `bg-primary` / `text-primary-contrast` (amber fill).
- The `@theme` names otherwise: `bg-board`, `text-board-ink`, `text-board-ink-2`, `border-board-line`, `text-accent` (amber **text** that passes contrast on white; `text-primary` is a fill colour and too light for text), `bg-accent-soft`, `bg-sorted`, `bg-gold|silver|bronze`, `text-success|warn|danger|info` and their `-soft` backgrounds.

Never raw hex/OKLCH in components, and no `@apply`. Fonts are Barlow (`font-sans`) and Barlow Condensed (`font-display`, uppercase for headings), self-hosted by `@nuxtjs/google-fonts`. Breakpoints add `nav:` (900px, header nav) and `wm:` (1100px, full wordmark).

## Components

Components are auto-imported **by file name** (`pathPrefix: false`), so names must be unique across folders. Layout: `components/layout/{header,page,footer}`, the public results tables in `components/tables` (native `<table>`, not DataTable), filters in `components/filters`, generic pieces in `components/util` (`AppIcon`, `AppField`, `StepIndicator`, `LoadingState`), and feature folders (`rankings`, `records`, `competitions` (with `registration/`), `athletes`, `account` (the profile tabs and VIP settings), `auth`, `checkout`, `admin` (by area), `verification`). PrimeVue owns the name `FormField`; ours is `AppField`.

Icons are Lucide, inlined as SVG by `<AppIcon name="lucide:search" />` from the generated map in [lib/constants/icons.ts](../lib/constants/icons.ts) (no icon runtime ships). Write the full `lucide:` name as a string literal and run `node scripts/gen-icons.mjs` after using a new icon. Icon-only buttons carry an `aria-label`.

The public pages (rankings, records, competitions, athletes, auth) use small native components so they do not load PrimeVue's runtime: `AppButton`, `NativeSelect`/`FilterSelect`, `SideDrawer` (native `<dialog>`), `AppTabs`, `AppTag`, and the native header drawer and user menu. Account, checkout, registration and admin screens use PrimeVue (`Button`, `InputText`, `Select`, `Dialog`, `DataTable`, …); a newly used PrimeVue component must be added to `primevue.components.include` in nuxt.config.ts and its tokens to theme/preset.ts. Toasts are mounted lazily (`LazyToast` in app.vue), so only use them for background results. A link styled as a button is `<Button v-slot="p" as-child><NuxtLinkLocale :class="p.class">`, never a button inside a link.

Every page uses one of four layouts: `default`, `account` (profile tabs), `admin`, `auth` (one centred card; `definePageMeta({ wide: true })` widens it). Pages start with a `PageHeader` title band, then `PageSection`.

## Thin pages

A page in `pages/` is `definePageMeta`, a title or SEO call (`usePageTitle`, `usePageSeo`, or `useSeoMeta` when the title comes from data), at most one composable call, and components. All 30 pages are under about 60 lines. Where things go instead:

- **Pure rules** (sorting, grouping, fees, validation constants, row shaping) in `lib/domain`, taking `t` as a parameter when they need wording. Types they share live in `types/`, so `lib/` never imports from `composables/`.
- **State and requests** in a composable, named after what it serves: `useRankingsPage`, `useAdminPurchases`, `useLoginForm`. It returns **one `reactive` object**, so templates read `rankings.pageRows` without `.value`.
- **Markup** in components of three kinds: *presentational* (props and events only: `ResultsTable`, `RankingsFilters`), *cards or screens* (one per page; they may call their own composable and often wrap `AuthCard` or `AdminPage`: `LoginCard`, `AdminPurchasesScreen`), and *flows* that switch between steps and take a composable's state as one typed prop (`CheckoutFlow`, `CompetitionResults`).
- **Several sibling parts editing the same state** (the registration wizard, admin vouchers, the meet editor, the results import) share it with provide/inject: a `createX` function, `useXPage()` in the screen that provides it, and `useX()` in the parts. Never write to a prop (ESLint `vue/no-mutating-props` fails the build of the habit): bind `:model-value` plus an event, or use injected state.

Pitfalls that cost time:

- A composable that awaits (`await useFetch`, `await $fetch`) loses the component instance after its first `await`. Call `useI18n`, `useNotify`, `useAuthSession`, `useHead` and the like **before** it, and call it from `<script setup>` with `await`.
- When the state must be provided before the data arrives, start the fetch without awaiting, provide, and return a `ready` promise that the screen awaits.
- Watchers do not re-run during server rendering. A `watch(data, prefill, { immediate: true })` created before the data has arrived renders defaults on the server and hydrates with different values (the registration wizard did this). Prefill explicitly once the data is in.
- vue-tsc can fail with "Excessive stack depth" on a literal-URL `$fetch`. It lands on whichever call is checked first (`VerificationForm.vue` in the baseline); passing the URL as a `string` avoids it.

## i18n is mandatory

English and Vietnamese, files in [i18n/locales/](../i18n/locales/), default locale `en`, Vietnamese routes prefixed `/vi`; the browser language decides the first visit and is kept in the `vpf_locale` cookie. Every user-visible string goes through `$t("...")`, so a new string means adding the key to **both** `en.json` and `vi.json`. API messages arrive already bilingual and are read with `useApiMessage()`. Numbers and dates go through [lib/domain/format.ts](../lib/domain/format.ts) with the active locale.

## Data fetching and URL state

Feature composables in [composables/](../composables/) wrap `useFetch` with an explicit `key` and return computed values plus `pending` / `error`. Public lists shrink large API responses in `transform` (`useRankings`, `useRecords`) so the SSR payload carries only the columns shown. Filters live in the URL through `useQueryState`, so views are shareable and the server renders the filtered list.

Who is signed in is only read in the browser for shared markup (the header renders the user menu in `<ClientOnly>`), because competition pages are prerendered. After login or register, call `useAuthSession().refresh()` before navigating so the next route guard sees the session.

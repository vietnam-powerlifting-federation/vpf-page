# Frontend conventions

The design is "Scoreboard" ([specs/frontend-redesign.md](../specs/frontend-redesign.md)): an always-dark board (header, title bands, table heads) over a page that follows the device theme, with one amber signal colour.

## Styling

Tailwind v4 through the `@tailwindcss/vite` plugin (no PostCSS config), plus `tailwindcss-primeui`. Design tokens are OKLCH CSS variables in [assets/styles/main.css](../assets/styles/main.css), written with `light-dark()` so they follow `color-scheme`, which `@nuxtjs/color-mode` forces with the `.light` / `.dark` class on `<html>`.

The PrimeVue preset ([theme/preset.ts](../theme/preset.ts), on Aura) points every colour at those variables, so a surface step means the same role in both themes. PrimeVue's own dark scheme is therefore off (`darkModeSelector: "none"`). Never write `dark:` pairs for surfaces; use:

- PrimeVue semantic classes where they exist: `bg-surface-0` (panel), `bg-surface-50` (page), `bg-surface-100` (raised/hover), `border-surface-200` (hairline), `border-surface-300` (input border), `text-color`, `text-muted-color`, `bg-primary` / `text-primary-contrast` (amber fill).
- The `@theme` names otherwise: `bg-board`, `text-board-ink`, `text-board-ink-2`, `border-board-line`, `text-accent` (amber **text** that passes contrast on white; `text-primary` is a fill colour and too light for text), `bg-accent-soft`, `bg-sorted`, `bg-gold|silver|bronze`, `text-success|warn|danger|info` and their `-soft` backgrounds.

Never raw hex/OKLCH in components, and no `@apply`. Fonts are Barlow (`font-sans`) and Barlow Condensed (`font-display`, uppercase for headings), self-hosted by `@nuxtjs/google-fonts`. Breakpoints add `nav:` (900px, header nav) and `wm:` (1100px, full wordmark).

## Components

Components are auto-imported **by file name** (`pathPrefix: false`), so names must be unique across folders. Layout: `components/layout/{header,page,footer}`, the public results tables in `components/tables` (native `<table>`, not DataTable), filters in `components/filters`, generic pieces in `components/util` (`AppIcon`, `AppField`, `StepIndicator`, `LoadingState`), and feature folders (`athletes`, `competitions`, `records`, `account`, `checkout`, `profile`, `admin`). PrimeVue owns the name `FormField`; ours is `AppField`.

Icons are Lucide through `@nuxt/icon` v1 (v2 needs Nuxt 4): `<AppIcon name="lucide:search" />`. Always write the full `lucide:` name as a string literal so the client-bundle scanner finds it. Icon-only buttons carry an `aria-label`.

Prefer PrimeVue components for controls (`Button`, `InputText`, `Select`, `Dialog`, `Drawer`, `Tag`, `Message`); admin screens keep `DataTable`. A link styled as a button is `<Button v-slot="p" as-child><NuxtLinkLocale :class="p.class">`, never a button inside a link.

Every page uses one of four layouts: `default`, `account` (profile tabs), `admin`, `auth` (one centred card; `definePageMeta({ wide: true })` widens it). Pages start with a `PageHeader` title band, then `PageSection`.

## i18n is mandatory

English and Vietnamese, files in [i18n/locales/](../i18n/locales/), default locale `en`, Vietnamese routes prefixed `/vi`; the browser language decides the first visit and is kept in the `vpf_locale` cookie. Every user-visible string goes through `$t("...")`, so a new string means adding the key to **both** `en.json` and `vi.json`. API messages arrive already bilingual and are read with `useApiMessage()`. Numbers and dates go through [lib/domain/format.ts](../lib/domain/format.ts) with the active locale.

## Data fetching and URL state

Feature composables in [composables/](../composables/) wrap `useFetch` with an explicit `key` and return computed values plus `pending` / `error`. Public lists shrink large API responses in `transform` (`useRankings`, `useRecords`) so the SSR payload carries only the columns shown. Filters live in the URL through `useQueryState`, so views are shareable and the server renders the filtered list.

Who is signed in is only read in the browser for shared markup (the header renders the user menu in `<ClientOnly>`), because competition pages are prerendered. After login or register, call `useAuthSession().refresh()` before navigating so the next route guard sees the session.

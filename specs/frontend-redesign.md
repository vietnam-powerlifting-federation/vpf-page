# Frontend redesign: "Scoreboard"

Status: **Built** (decided and implemented 2026-10-23). This document is the source of truth for the new frontend. The prototype at [redesign/index.html](../redesign/index.html) (style A, `?style=scoreboard`) is the visual reference. Its CSS lives in [redesign/shared/base.css](../redesign/shared/base.css) + [redesign/styles/scoreboard.css](../redesign/styles/scoreboard.css), and its behaviour in [redesign/shared/app.js](../redesign/shared/app.js). Serve it with `python3 -m http.server 4173 -d redesign`. The broader rollout plan is in [redesign/PLAN.md](../redesign/PLAN.md).

## 1. Scope and decisions

The site becomes **one app**. The marketing pages are deleted, and everything under `/openvpf` moves to the root.

| # | Decision |
| --- | --- |
| D1 | Delete the static pages (`/`, `/about`, `/about-vpf`, `/championships`, `/contact`, `/membership`, `/news`), `content/`, `content.config.ts` and `@nuxt/content`. **No redirects** for them. |
| D2 | `/openvpf/**` gets a **301 to `/**`** via `routeRules`. This replaces `middleware/openvpf-redirect.global.ts`. |
| D3 | Keep every page's name and behaviour. Rebuild every component, layout and style from scratch. |
| D4 | **PrimeVue stays** (styled mode, preset generated from the tokens in §3). The one exception is the **public results tables**, which are a native `<table>` component family (§5). |
| D5 | **Traditional tables at every width.** No card mode on phones: narrow screens scroll the table sideways inside its panel. |
| D6 | i18n: enable `detectBrowserLanguage` (cookie-persisted). `vi` for Vietnamese browsers, `en` otherwise. |
| D7 | No contact details anywhere. Delete `lib/config/contact.ts`. |
| D8 | Style direction **A · Scoreboard**: personality, but it must read as the official federation site. |
| D9 | Source organization follows [Tachi](https://github.com/zkldi/Tachi)'s client (`components/layout/{header,page,footer}`, `components/tables/{cells,…}`, `components/util`), mapped onto this repo's layer rules (§7). |

Non-functional goals: UX and accessibility first (WCAG 2.2 AA), fast on mid-range phones, and usable by non-technical users.

## 2. The idea

An arena scoreboard. A **board** is a dark panel that stays dark in **both** themes, like a real scoreboard, and carries the site header and each page's title band. The rest of the page follows the device theme (light or dark). The logo is **three white judging lights**, a "good lift". There is one signal colour, **amber**, used for the primary action, the current nav item, the sorted column and the leader.

Keep it professional: no decorative animation, no gradients on text, no emoji, and nothing glowing beyond the small light dots.

## 3. Tokens

Colours are OKLCH. Theme-dependent tokens use `light-dark()`. `color-scheme` is `light dark` by default and is forced by `.dark` / `.light` from `@nuxtjs/color-mode`.

### Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `oklch(96.5% 0.004 90)` | `oklch(13.5% 0.008 260)` | page background |
| `surface` | `oklch(100% 0 0)` | `oklch(18% 0.01 260)` | panels, table cells |
| `raised` | `oklch(93.5% 0.006 90)` | `oklch(23% 0.012 260)` | hover, pressed segment |
| `line` | `oklch(88% 0.008 90)` | `oklch(28% 0.012 260)` | hairlines |
| `line-strong` | `oklch(74% 0.01 90)` | `oklch(42% 0.014 260)` | input borders |
| `ink` | `oklch(16% 0.01 260)` | `oklch(96% 0.005 90)` | text |
| `ink-2` | `oklch(42% 0.012 260)` | `oklch(75% 0.012 260)` | secondary text (≥ 4.5:1 on paper and surface) |
| `accent` | `oklch(50% 0.12 70)` | `oklch(84% 0.16 85)` | amber **text** (links, sorted header on light surfaces) |
| `accent-fill` | `oklch(84% 0.16 85)` | same | amber **fills** (primary button, leader marker) |
| `accent-fill-hover` | `oklch(88% 0.15 88)` | same | |
| `on-accent` | `oklch(16% 0.01 260)` | same | text on amber: always dark |
| `accent-soft` | `oklch(93% 0.06 90)` | `oklch(30% 0.06 85)` | chips, sorted-cell hover |
| `sorted` | `oklch(97% 0.03 90)` | `oklch(21% 0.025 85)` | background of the sorted column |
| `focus` | `oklch(55% 0.18 255)` | `oklch(72% 0.14 255)` | focus ring (blue, never amber) |
| `gold` / `silver` / `bronze` | `oklch(84% 0.16 85)` / `oklch(86% 0.01 260)` / `oklch(72% 0.1 55)` | same | ranks 1–3 |
| `on-medal` | `oklch(18% 0.02 60)` | same | |

**Board** tokens are constant across themes:

| Token | Value |
| --- | --- |
| `board` | `oklch(14% 0.01 260)` (header, title band, table head) |
| `board-2` | `oklch(19% 0.012 260)` (cards and hover on the board) |
| `board-line` | `oklch(30% 0.014 260)` |
| `board-ink` | `oklch(96% 0.005 90)` |
| `board-ink-2` | `oklch(76% 0.012 260)` |

The title band carries a 6px dot texture (`radial-gradient(oklch(100% 0 0 / 0.045) 1px, transparent 1.2px)`) and a 3px `accent-fill` bottom rule.

**Mapping into the stack:** PrimeVue preset `primary` is the amber palette, with `primary.color` = `accent-fill` and `primary.contrastColor` = `on-accent` in both schemes. `surface` is a neutral scale whose 0/50/… steps land on `surface`/`paper`/`raised`/`line` per scheme. Board, medal, `sorted` and `accent` (text) are Tailwind v4 `@theme` colours (`bg-board`, `text-board-ink`, `text-accent`, …). Components use PrimeVue semantic classes (`bg-surface-0`, `text-primary`, `border-surface-200`) where a mapping exists, and the `@theme` names otherwise. **Never raw hex/OKLCH in components.**

### Type

| Role | Family | Weights | Notes |
| --- | --- | --- | --- |
| Display, labels, numbers | **Barlow Condensed** | 600, 700, 800 | Headings uppercase. Numbers use `tabular-nums`. |
| Body / UI | **Barlow** | 400, 500, 600 | 16px base, line-height 1.5 |

Both fonts ship the Vietnamese subset. Self-host them through `@nuxtjs/google-fonts` (`download: true`, `display: swap`), with no third-party request at runtime. SVN-CenturyGothic is removed.

| Element | Spec |
| --- | --- |
| Page title (h1) | Barlow Condensed 800, uppercase, `clamp(2.5rem, 1.5rem + 4vw, 4.5rem)`, line-height 1.02, `padding-top: .08em` (room for stacked Vietnamese diacritics) |
| Kicker | Barlow Condensed 700, uppercase, `.12em` tracking, `accent-fill`, preceded by an 8px glowing dot. One per page at most. |
| Section labels, field labels, table head, result count, primary buttons | Barlow Condensed 700, uppercase, `.06–.08em` tracking |
| Table numbers | Barlow Condensed 600, 1.125rem; sorted column 700; GL 1.25rem |
| Nav links | Barlow Condensed 700, uppercase, 1.0625rem |

No italic headings, ever. No text smaller than 12px (`0.75rem`).

### Space, radius, motion

- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 px (`2xs … 2xl`). Container max 1240px, gutter 16px (24px from 768px).
- Radius: 4px for controls, 6px for panels and cards, full for pills and light dots.
- Motion: 120ms (`--dur-fast`) for colour and transform, 200ms for drawers and disclosures, easing `cubic-bezier(.2,.8,.2,1)`. Only `transform`, `opacity` and colours are animated. `prefers-reduced-motion` reduces it all to ≤1ms.
- Tap targets ≥ 44×44px. Focus ring: 2px `focus`, 2px offset, never animated.

## 4. Layout and chrome

- **Header** (N1b, sticky, 64px, `board` background in both themes): on the left, the three-lights mark + "VPF" + "Vietnam Powerlifting Federation" (from 1100px). In the centre, the nav (Rankings · Records · Competitions); the current item is amber with a 3px amber underline. On the right, an EN/VI segmented switch, the theme toggle, then **Log in** (amber), or the user menu when signed in. Below 900px, the nav, language and theme controls move into a right-hand `Drawer`, and the menu button appears.
- **Title band** (`PageHeader`): a full-bleed board holding the kicker, h1, lede (`board-ink-2`), an optional help disclosure (amber summary), and an optional right-hand slot. Rankings uses that slot for the top 3. At ≥1024px it's a two-column grid (`0.9fr / 1.3fr`); below that it stacks.
- **Content** is on `paper` below the band, with panels in `surface` and a 1px `line` border. The filter panel has a 3px `ink` top rule.
- **Footer** (Ft2): federation name and the line "Results are official once a competition is closed." Nothing else.
- **Layouts:** `default` (header + slot + footer), `account` (adds the profile section nav: side rail ≥1024px, scrollable tabs below), `admin` (adds the admin nav), `auth` (one centred card on `paper`, header kept). Login and register use the wide variant: the form on the left and the VPF photo (`assets/img/login-bg.png`) on the right from 768px, in one card; on phones the photo is hidden and the form comes first. Other auth pages (forgot password, verify email, identity verification) are the single card.

## 5. Components

### Results tables (`components/tables/`)

These are used by rankings, competition scoresheets, records and athlete history.

- A native `<table>` inside a panel, in a scroll container: `overflow-x: auto`, with `role="region"`, `aria-labelledby` = the caption, and `tabindex="0"` **only while it overflows**.
- **Pinned columns:** rank (3.5rem) and athlete stay `position: sticky` on the left. Once the user scrolls sideways, the athlete column shows a right-edge shadow.
- **Overflow hint:** while the table overflows, one line above it reads "Swipe the table sideways to see every lift."
- **Head:** a `board` row with `board-ink-2` uppercase labels. Sortable headers are `<button>`s with a down-arrow icon; the active one is amber and gets `aria-sort="descending"`.
- **Sorted column:** cells get the `sorted` background and weight 700.
- **Rank cell:** a 2rem square with 4px radius. Ranks 1–3 are gold/silver/bronze with `on-medal` text, and the number always stays visible.
- **Athlete cell:** the name links to the athlete page (600 weight, amber underline on hover). Below it, one line reads `Category · Weight class · Division`.
- **Rankings columns:** `# · Athlete · GL points · Total (kg) · Squat (kg) · Bench (kg) · Deadlift (kg)`. The ranking score sits right after the name, so phones see it without scrolling.
- Every table has a visible-to-AT `<caption>` describing the content and current sort.
- Pagination sits below: rows per page (25/50/100), "1–25 of 40", and previous/next icon buttons with labels. Only one page of rows is in the DOM.

### Top 3 ("Leading the table")

The top three of the **current filter set** appear as cards on the board (`board-2`, `board-line`). The 1st card gets a 3px inset amber top edge and an amber rank numeral. Each card shows the rank numeral (Barlow Condensed 800: 3.25rem from 640px, 2.25rem below), the name link (the whole card is clickable), the meta line, and the score in the active sort metric with its unit in amber. Below 640px the cards become compact rows: rank · name/meta · score.

### Filters (rankings pattern, reused for records)

- **Search:** visible label, 48px input, clear button, and **accent- and đ-insensitive** matching (NFD-fold, `đ→d`) on name and VPF ID. A hint under it says accents are optional. Debounce 120ms.
- **Category:** a segmented control (All · Men · Women). The checked segment is filled with `ink`.
- **Weight class** (grouped by category and narrowed when a category is picked), **Division**, **Competition type** and **Rank by** use PrimeVue `Select` with visible labels.
- Every filter is mirrored in the URL query (`useQueryState`), so views can be shared, the back button works, and the server renders the filtered list.
- Below 768px the non-search filters collapse into a "Filters" disclosure with a count badge; from 768px they're always open.
- **Active filters:** shown as removable chips after the result count, with a "Reset filters" link. The result count is a polite live region.
- **Empty state:** a heading, one plain sentence, and a Reset button.

### Other conventions

- **Help copy for non-experts:** "What are GL points?" on rankings, and "Division = age group" helper text where divisions are picked.
- **Icons:** Lucide via `@nuxt/icon` (local bundle). `aria-hidden` when decorative; icon-only buttons have an `aria-label`. Remove primeicons.
- **Forms:** visible labels, errors under the field via `aria-describedby`, focus moves to the first error on submit, and correct `autocomplete` attributes.
- **Toasts** only for background results. A successful inline action changes the UI in place.

## 6. Accessibility and performance targets

- WCAG 2.2 AA. Check with axe plus a keyboard-only pass on every page, in light and dark, EN and VI.
- Contrast: text ≥ 4.5:1 and UI/focus ≥ 3:1 against both `paper`/`surface` and `board`.
- Landmarks, a skip link ("Skip to main content"), `aria-current="page"` on nav, `<html lang>` following the locale, and focus trapped and restored in drawers and dialogs.
- Budgets for public pages on a mid-range phone over 4G: LCP < 2.0s, CLS < 0.05, INP < 200ms, route JS < 120 KB gzip.
- Load heavy pieces only when used: certificate PDF (`jspdf`, `html2canvas-pro`), image cropper, VIP banner slideshow. Give images explicit dimensions via `@nuxt/image`.
- Remove unused dependencies after checking them: `vuetify-nuxt-module`, `@mdi/font`, `primeicons`, the duplicate `@primevue/themes`, `@nuxt/content`, `nuxt-link-checker`, and one of the two croppers.

## 7. Source organization

```
assets/styles/main.css      @import "tailwindcss"; tokens (§3) as CSS vars + @theme; base element styles
layouts/                    default · account · admin · auth
components/layout/header/   SiteHeader, MainNav, MobileNav, UserMenu, LangSwitch, ThemeToggle, BrandMark
components/layout/page/     PageHeader (title band), PageSection
components/layout/footer/   SiteFooter
components/tables/          ResultsTable, cells/ (RankCell, AthleteCell, LiftCell, AttemptCell, GlCell), components/ (TablePager, TableEmpty, TableSkeleton)
components/filters/         SearchField, SegmentedControl, FilterChips
components/{athletes,competitions,records,account,checkout,admin}/   feature components
components/util/            AppIcon, LoadingState, ApiError, ExternalLink
composables/                existing data composables + useQueryState
lib/domain/format.ts        display formatters (weight class, kg, GL) moved out of patch-payload.ts
```

Repo rules still apply (CLAUDE.md): Tailwind utilities only, no `@apply`, every string via `$t()` in both `en.json` and `vi.json`, and no SQL file edits.

## 8. Routes

| Old | New | Layout |
| --- | --- | --- |
| `/openvpf` | `/` (Rankings) | default |
| `/openvpf/records` | `/records` | default |
| `/openvpf/competitions`, `/[slug]`, `/[slug]/register` | `/competitions`, … | default |
| `/openvpf/athletes/[slug]` | `/athletes/[slug]` | default |
| `/openvpf/checkout` | `/checkout` | default |
| `/openvpf/profile/*` | `/profile/*` | account |
| `/openvpf/admin/**` | `/admin/**` | admin |
| `/login`, `/register`, `/forgot-password`, `/verify-email`, `/verification` | unchanged | auth |

Also update: the prerender hook in `nuxt.config.ts`, hard-coded `/openvpf` links (in `middleware/admin.ts`, `pages/verification.vue`, components), and i18n keys `openvpf.headerNav.*` → `nav.*`.

## 9. Delivery order

Each step is its own commit or PR, and the app works after each one.

1. **Foundation:** tokens, fonts, icons, PrimeVue preset, color-mode, i18n detection, layouts, header, footer, PageHeader. Delete the static pages and content. Move the routes and add the redirect.
2. **Shared tables and filters,** and Rankings, which must match the prototype.
3. **Records,** competitions list and detail, athlete profile.
4. **Competition registration,** checkout, profile tabs, auth pages.
5. **Admin screens.**
6. **Cleanup:** remove dependencies, then run Lighthouse, axe and the viewport matrix (320/375/414/768/1024/1440).

## 10. Progress

| Step | Commit | State |
| --- | --- | --- |
| 1 Foundation | `fcb1dcf` | Done |
| 2 Tables, filters, Rankings | `70001a5` | Done |
| 3 Records, competitions, athlete | `d1fac34` | Done |
| 4 Registration, checkout, profile, auth | `32d28ed` | Done |
| 5 Admin | `1e27ecd` | Done |
| 6 Cleanup and audit | `5f95b18`, `1aa27c2` | Done except the JS budget (below) |

Audit (2026-10-23):

- **Accessibility:** axe (WCAG 2.2 AA) ran on 34 page-and-theme combinations. It found two problems, both fixed: the PrimeVue password field's invalid `aria-expanded`, and missing labels on the VIP colour inputs. The colour-picker page hasn't been re-checked since its fix.
- **Widths:** no sideways scrolling on 12 main pages at 320, 375, 414, 768, 1024 or 1440px. Tables scroll inside their own panel, as intended.
- **Keyboard:** the skip link and the mobile-menu focus handling work.
- **Build:** the production build succeeds.

Follow-up (2026-10-23):

| Item | Commit | State |
| --- | --- | --- |
| LCP / CLS measured, CLS fixed | `d898177` | Done |
| Photo panel on register (§4) | `d765d40` | Done |
| JS budget | `ab7ae03` | Improved, not met (below) |
| Registration after identity verification, end to end | "test(frontend): registration after identity verification" | Done, including the R2 upload |

**LCP and CLS** (production build on the local server, cold cache, no throttling; the database has no Redis cache locally, so server time dominates):

| Route | Phone 375px LCP / CLS | Desktop 1280px LCP / CLS | Server TTFB |
| --- | --- | --- | --- |
| `/` | 3.41 s / 0.040 | 1.92 s / 0.008 | 1.7–3.2 s |
| `/records` | 0.97 s / 0.001 | 1.12 s / 0.017 | ~0.75 s |
| `/competitions` (prerendered) | 0.24 s / 0.001 | 0.29 s / 0.028 | ~20 ms |
| `/competitions/national-2025` (prerendered) | 0.30 s / 0.035 | 0.32 s / 0.004 | ~30 ms |
| `/athletes/VPF000084` | 1.72 s / 0.011 | 1.58 s / 0.000 | ~1.4 s |

LCP is the time to first byte plus 170–360 ms on every route, so the remaining LCP cost is the server (the results and profile queries without Redis), not the page. CLS is under 0.05 everywhere. Before the fix, prerendered competition pages shifted 0.18–0.24: with payload extraction on, the client hydrated them without data and refetched, which emptied the list for a moment. They now inline their payload. The 0.04 on Rankings at phone width is the title re-wrapping when Barlow Condensed replaces the fallback; the title, nav and body faces are now preloaded.

**JS per public route** (all initial JS, gzip -9):

| Route | Before | After |
| --- | --- | --- |
| `/` | 215 KB | 147 KB |
| `/records` | 213 KB | 145 KB |
| `/competitions` | 184 KB | 138 KB |
| `/competitions/national-2025` | 221 KB | 145 KB |
| `/athletes/VPF000084` | 191 KB | 144 KB |
| `/login` | 195 KB | 134 KB |
| `/register` | — | 133 KB |

What changed: the PrimeVue module registers only the 29 components in use instead of ~140, so the entry no longer carries a stub for each and pages no longer get every component's styles injected. Toast mounts after the page is idle. Public and auth pages use small native components (`AppButton`, `NativeSelect`, `SideDrawer`, `AppDialog`, `AppTabs`, `AppTag`, `AppInput`, `PasswordInput`, and a native header drawer and user menu) instead of PrimeVue. Icons are inline SVG from a generated Lucide map (`scripts/gen-icons.mjs`) instead of the `@nuxt/icon` runtime.

Still open:

1. **JS budget (120 KB) missed by 13–27 KB.** The shared entry alone is 122 KB: Vue, Nuxt, the router and unhead (~75 KB), vue-i18n with its message compiler (~20 KB), PrimeVue's config and theme engine (~13 KB) and app code (~10 KB). Getting under 120 KB would need two larger changes: install PrimeVue only on the account, checkout, registration and admin routes (replacing `@primevue/nuxt-module` with a lazily installed plugin plus its own SSR style handling), and drop vue-i18n's message compiler (`bundle.dropMessageCompiler` was tried and broke server-side message evaluation with "unhandled node type"). Both were left out as too risky for this pass.
2. ~~Identity verification R2 upload untested.~~ Done on 2026-10-23 after the R2 credentials were fixed: the verification form uploaded the ID-card photo (a generated "TEST ID - NOT REAL" image) to the bucket, and approving it from `/admin/verifications` deleted the object again (confirmed with a HeadObject: NotFound). Before that, the rest of the flow had been tested with a verification row inserted directly in the database: approval from `/admin/verifications`, then a Test Meet registration through the wizard (member, Men 74 kg Open, no Media Plus, entry fee 0 ₫ + 2026 membership 200,000 ₫), the QR step, and the purchase approved from `/admin/purchases`; the wizard moved to "Registration successful" on its own.
3. **SSR HTML weight:** pages are 47–73 KB gzip, mostly PrimeVue theme and component styles that the module injects into every page.
4. **Admin athlete editor** shows hydration mismatches: its form is filled on the client after the server rendered it empty. This was already the case before the redesign.

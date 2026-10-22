# VPF frontend overhaul: plan (draft)

Status: draft v2. Preview: [index.html](index.html) has four switchable style directions. Serve the folder (e.g. `python3 -m http.server -d redesign`) because the page loads its CSS and JS as separate files. The athletes and numbers are sample data.

## 1. What changes

| Today | After |
| --- | --- |
| Two sites in one app: a marketing site (`/`, `/about`, `/news`, …) and the app under `/openvpf/**` | One app. The app's pages move to the root: `/openvpf/records` → `/records` |
| Several header/layout systems (`AppHeader`, `OpenVPFHeader`, 6 layouts), mostly dark-only styling, SVN-CenturyGothic, primeicons font | One design system (tokens, two fonts, an SVG icon set), light **and** dark that follow the device, 4 layouts |
| Components scattered at the root of `components/` | Folders by feature, following Tachi (see §4) |

Kept as they are: every page's **name** and **behaviour**, the API, `lib/`, `types/`, the server, the database, i18n keys where they still fit, and the auth/guard logic in `middleware/auth.ts` and `middleware/admin.ts`.

## 2. Decisions

Settled (2026-10-22):

1. **PrimeVue** stays (styled mode, preset generated from the design tokens). The exception is the **public results tables**, which become a small native `<table>` family (see §4 `components/tables/`).
2. **Static pages** are deleted outright, with no redirects. `/openvpf/**` still gets a 301 to `/**`, because shared links, QR codes and search results point there.
3. **Language:** enable `detectBrowserLanguage` in `@nuxtjs/i18n`. Vietnamese browsers get `vi`, everyone else `en`, and the choice is remembered in a cookie.
4. **Contact details** are removed. No footer contact block, and `lib/config/contact.ts` is deleted (only the static pages used it).
5. **Tables are traditional at every width.** No card mode on phones. On narrow screens the table scrolls sideways inside its panel. The rank and athlete columns stay pinned, a one-line hint says to swipe, and the scroll area is focusable so keyboard users can scroll it.

Still open:

- **Style direction:** pick one of A · Scoreboard, B · Gazette, C · Plates, D · Red & Gold, E · Supabase-like (§5). Mixing is fine, e.g. "C's colours with B's masthead".

## 3. Routes

| Old | New | Layout |
| --- | --- | --- |
| `/openvpf` | `/` (Rankings) | default |
| `/openvpf/records` | `/records` | default |
| `/openvpf/competitions` | `/competitions` | default |
| `/openvpf/competitions/[slug]` | `/competitions/[slug]` | default (competition header is a component, not a layout) |
| `/openvpf/competitions/[slug]/register` | `/competitions/[slug]/register` | default |
| `/openvpf/athletes/[slug]` | `/athletes/[slug]` | default |
| `/openvpf/checkout` | `/checkout` | default |
| `/openvpf/profile/*` (6 tabs) | `/profile/*` | account |
| `/openvpf/admin/**` (10 pages) | `/admin/**` | admin |
| `/login`, `/register`, `/forgot-password`, `/verify-email`, `/verification` | unchanged | auth |

**Deleted (no redirects):** `pages/index.vue` (marketing), `about.vue`, `about-vpf.vue`, `championships.vue`, `contact.vue`, `membership.vue`, `news.vue`, `content/` + `content.config.ts` + the `@nuxt/content` module, `AppHeader`, `AppFooter`, `OpenVPFHeader`, every existing layout, `middleware/openvpf-redirect.global.ts` (replaced by a `/openvpf/**` → `/**` 301 in `routeRules`), `lib/config/contact.ts`, `plugins/route-class.client.ts`, `assets/styles/vpf-components.css`, the SVN-CenturyGothic font files, and `assets/img/hero-bg.jpg`. Every existing component under `components/` gets rebuilt, and the old files are deleted as each replacement lands.

**Also updated:** the prerender hook in `nuxt.config.ts` (`/openvpf/competitions` paths), and the hard-coded `/openvpf` links in `middleware/admin.ts` and `pages/verification.vue`. API tests are unaffected because the API doesn't change.

## 4. Source organization (after Tachi)

Tachi's client splits into `app/pages` + `app/routes`, `components/<feature>/…`, `components/layout/{header,footer,page,subheader}`, `components/tables/{cells,headers,components}`, `components/util/…`, `context/`, `lib/`, `styles/{components,utilities,themes}`, `types/`, `util/`. Mapped onto Nuxt conventions and this repo's layer rules:

```
assets/styles/
  main.css            @import "tailwindcss"; @theme mapping of the tokens; base element styles
  tokens.css          OKLCH colour, type, space, radius, motion tokens (light + dark)
layouts/
  default.vue         SiteHeader + <slot> + SiteFooter
  account.vue         default + profile section nav (side rail on desktop, scrollable tabs on phone)
  admin.vue           default + admin nav
  auth.vue            centered single card (Tachi's CenterLayoutPage / LoginPageLayout)
components/
  layout/
    header/           SiteHeader, MainNav, MobileNav (Drawer), UserMenu, LangSwitch, ThemeToggle
    page/             PageHeader (title, lede, optional help disclosure, actions; Tachi's subheader)
    footer/           SiteFooter
  tables/             shared results-table family (Tachi's tables/)
    ResultsTable.vue      native table, sortable headers (aria-sort), pinned rank + name columns, sideways scroll on narrow screens
    cells/            RankCell, AthleteCell, LiftCell, AttemptCell, WeightClassCell, GlCell
    components/       TablePager, TableEmpty, TableSkeleton
  filters/            SearchField (accent-insensitive), SegmentedControl, FilterChips
  athletes/           AthleteHeader, AthletePbs, AthleteHistory, AthleteRecords, VipBanner, SocialLinks, RecordCertificateDialog
  competitions/       CompetitionCard, CompetitionHeader, ScoresheetTable, GlRankingPanel, RegistrationForm
  records/            RecordsMatrix, RecordHistoryList
  account/            ProfileForm, VipSettingsForm, VipPreview, ImageCropperDialog, VoucherList, PaymentHistory
  checkout/           CartSummary, VoucherPicker, QrPayment
  admin/              per-screen components
  util/               AppIcon, LoadingState, ApiError, ExternalLink, VisuallyHidden
composables/          existing data composables + useQueryState (filters <-> URL, like Tachi's useQueryString)
lib/domain/           unchanged; display formatters (weight class, kg, GL) move from patch-payload.ts into format.ts
```

Rules: pages stay thin (fetch via composables, compose components), Tailwind utilities only (no `@apply`), colours only through tokens or PrimeVue semantic classes, and every string through `$t()` in both `en.json` and `vi.json`.

## 5. Design system: five directions to choose from

Open [index.html](index.html) and switch styles in the dark bar at the top. Each direction also works in light and dark (moon/sun button) and in EN/VI.

All five directions share the same structure, behaviour and accessibility rules, and only the visual layer changes:

| | A · Scoreboard | B · Gazette | C · Plates | D · Red & Gold | E · Supabase-like |
| --- | --- | --- | --- | --- | --- |
| **Idea** | Arena scoreboard | The sports pages of a serious newspaper | The competition platform: calibrated plate colours | National federation, ceremonial | Developer-console calm (Supabase-inspired) |
| **Signature** | An always-dark board holding the title and the top 3; the logo is three white judging lights ("good lift") | Masthead with dateline and ruled nav; leaders box in a side rail; box-score table | Red · blue · yellow · green plate stripe; stepped podium where the heaviest plate (red 25 kg) marks 1st | Flag-red band with a gold star logo; gold card for 1st | Faint grid behind the title, mono uppercase labels with a green status dot, stat-card leaders, table-editor style grid |
| **Type** | Barlow Condensed + Barlow | Newsreader (serif) + IBM Plex Sans | Archivo (semi-expanded headings) | Anton + Be Vietnam Pro | Inter + Source Code Pro (labels, numbers) |
| **Accent** | Signal amber | Vermilion | Plate blue (actions), plate colours (ranks) | Flag red + star gold | Emerald green on neutral greys |
| **Feels** | Energetic, broadcast | Authoritative, archival | Modern sport body, clean | Proud, official | Precise, modern, technical |

All the fonts support Vietnamese diacritics and tabular numbers. Each direction then follows the same rules:

- **Tokens:** OKLCH colour tokens with `light-dark()`, so each style is one token block, and the default theme follows the device. In the app, `@nuxtjs/color-mode` (already installed) applies it on the server, so there is no flash.
- **Colour never carries meaning alone:** ranks 1–3 always show their number, and the sorted column is marked with an arrow and `aria-sort`.
- **Fonts:** self-hosted via `@nuxtjs/google-fonts` (`download: true`), only the weights used.
- **Icons:** SVG (Lucide via `@nuxt/icon`, bundled locally) replace the primeicons font.
- **Motion:** 120–200ms colour/opacity transitions only, and `prefers-reduced-motion` is respected.

**New on the rankings page in every direction:** a "Leading the table" block showing the top 3 of whatever filters are active. The athlete column now carries `Category · Weight class · Division` under the name. That brings the table down to 7 columns (`# · Athlete · GL · Total · Squat · Bench · Deadlift`), with the ranking score right next to the name, so phones see it without scrolling.

## 6. Pages: what each keeps and what changes

- **Rankings (`/`):** everything the current page does (search, sort, sex, division, weight class, competition type), plus: filters live in the URL (shareable, back button works, SSR renders the filtered list), search ignores accents ("nguyen" finds "Nguyễn"), removable filter chips with a result count announced to screen readers, clickable column headers, a "What are GL points?" explainer, the top-3 block, and pagination.
- **Records:** current records plus record history and certificate. It becomes a weight-class × lift matrix (holder, kg, date) with sex/division/year filters in the URL. Tapping a record opens its history in a Drawer. Certificate generation (`jspdf`, `html2canvas-pro`) is loaded only when someone asks for a certificate.
- **Competitions:** upcoming competitions as cards (date, location, registration deadline, a "Register" button with its state), and past competitions as a compact list grouped by year.
- **Competition detail:** a competition header component replaces the `openvpf-competitions` layout. Tabs are kept (GL ranking, scoresheet, detailed scoresheet) and synced to `?tab=`. The scoresheet uses `ResultsTable` with attempt cells (good/no lift shown by icon + strike-through, not colour alone).
- **Register:** the same rules and states (blocked, already registered, identity pending/required, email not verified, guest). Split into steps with a progress indicator: details → equipment settings → fees and voucher → confirm. Errors sit next to their fields.
- **Athlete profile:** a header (name with VIP decorator, avatar, socials), then PBs, records and competition history using the shared table cells. The VIP banner slideshow is kept, lazy, pauses on hover and focus, and shows a static image under reduced motion.
- **Checkout:** the same flow (cart, voucher, QR payment, free path), restyled in steps.
- **Profile (6 tabs) and admin (10 screens):** same functionality, new layouts. Admin keeps PrimeVue DataTable because it's dense, internal and keyboard-heavy.
- **Auth pages:** single centered card, show-password toggle, `autocomplete` attributes, and a language switch on the card.

## 7. Accessibility (target: WCAG 2.2 AA)

- Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI and focus, checked in both themes.
- Tap targets ≥ 44px. A visible `:focus-visible` ring that is never animated.
- Skip link, landmarks, `aria-current` on nav, `aria-sort` on tables, a caption on every table, and a polite live region for result counts.
- Every input has a visible label; placeholders are never the only label. Errors are linked with `aria-describedby`, and focus moves to the first error on submit.
- `<html lang>` follows the i18n locale. Dialogs and drawers trap and restore focus. Everything works by keyboard.
- Plain-language copy: explain GL, explain divisions as age groups, and avoid jargon in errors.
- Check each page with axe plus a keyboard-only and screen-reader pass (NVDA/VoiceOver) before it ships.

## 8. Performance

- Budgets for the public pages on a mid-range phone over 4G: LCP < 2.0s, CLS < 0.05, INP < 200ms, route JS < 120 KB gzip.
- Remove the dead weight. First check that each of these is unused, then remove it: `vuetify-nuxt-module`, `@mdi/font`, `primeicons`, the duplicate `@primevue/themes`, `@nuxt/content`, `nuxt-link-checker`, and one of the two croppers (`cropperjs` / `vue-picture-cropper`).
- Load heavy pieces only when needed: certificate PDF libraries, the image cropper, VIP preview and banner slideshow. Admin code is already split by route.
- Keep only one page of rows in the DOM. If any filter set returns more than ~1,000 rows, move to server-side pagination on `/api/results`, which means an API change plus test updates as CLAUDE.md requires.
- `@nuxt/image` with explicit width and height on all images (avatars, banners, competition covers) so the layout doesn't shift. Use AVIF/WebP.
- Keep the existing caching and prerender approach, with paths updated.

## 9. Delivery order

Each step is a mergeable PR. Old and new pages never coexist on the same route.

1. **Foundation:** tokens for the chosen direction, fonts, icons, PrimeVue preset, color-mode, i18n browser detection, the 4 layouts, header, footer and PageHeader. Delete the static pages, `content/`, `lib/config/contact.ts`, old layouts and headers. Move `pages/openvpf/*` → `pages/*` and add the `/openvpf/**` redirect. At this point the app still works on the old components.
2. **Shared tables and filters:** `ResultsTable` + cells + `useQueryState`. Rebuild Rankings (matches the preview).
3. **Public pages:** Records, Competitions list and detail, Athlete profile.
4. **Account flows:** Register for competition, Checkout, Profile tabs, Auth pages.
5. **Admin:** the 10 screens.
6. **Cleanup and audit:** remove leftover components and dependencies, run Lighthouse and axe on every route, test at 320, 375, 414, 768, 1024 and 1440px in both themes and both languages.

## 10. Risks

- **Search engines and saved links:** handled by 301s. Check Search Console after launch.
- **i18n churn:** a lot of keys will be renamed (`openvpf.headerNav.*` → `nav.*`). Do it once, in step 1, in both locale files.
- **VIP decorators** (name gradients, avatar frames) have to stay readable in light mode. They'll need a contrast check against both surfaces.

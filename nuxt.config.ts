import { defineNuxtConfig } from "nuxt/config"
import tailwindcss from "@tailwindcss/vite"
import { ScoreboardPreset } from "./theme/preset"

export default defineNuxtConfig({
  compatibilityDate: "2026-01-02",

  modules: [
    "@nuxt/test-utils/module",
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxtjs/color-mode",
    "@nuxtjs/google-fonts",
    "@nuxt/image",
    "@primevue/nuxt-module",
  ],

  // Feature folders are for organisation only; components are named by file (SiteHeader, not LayoutHeaderSiteHeader).
  components: [{ path: "~/components", pathPrefix: false }],

  i18n: {
    // Canonical origin for hreflang links. Override with NUXT_PUBLIC_I18N_BASE_URL.
    baseUrl: "https://openvpf.vn",
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "vi", language: "vi-VN", file: "vi.json" },
    ],
    defaultLocale: "en",
    // Vietnamese browsers get /vi on their first visit; the choice is then kept in a cookie.
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "vpf_locale",
      redirectOn: "root",
      alwaysRedirect: false,
      fallbackLocale: "en",
    },
  },

  colorMode: {
    preference: "system",
    fallback: "light",
    classSuffix: "",
    storageKey: "vpf-color-mode",
  },

  // Self-hosted at build time: no request to Google at runtime.
  googleFonts: {
    families: {
      "Barlow": [400, 500, 600],
      "Barlow Condensed": [600, 700, 800],
    },
    subsets: ["latin", "latin-ext", "vietnamese"],
    display: "swap",
    download: true,
    inject: true,
    // Absolute URLs, served by Nitro from the download folder, so the critical
    // faces can be preloaded below under a stable name.
    fontsPath: "/fonts",
  },

  css: ["~/assets/styles/main.css"],

  primevue: {
    // Register only the components the app uses. By default every PrimeVue
    // component (~140) is registered globally, which put a stub for each into
    // the entry bundle and SSR-injected every component's styles into each page.
    components: {
      include: [
        "Button", "Checkbox", "ColorPicker", "Column", "DataTable", "DatePicker", "Dialog", "Drawer",
        "IconField", "InputIcon", "InputNumber", "InputText", "Menu", "Message", "MultiSelect", "Password",
        "ProgressSpinner", "RadioButton", "Select", "SelectButton", "Tab", "TabList", "TabPanel", "TabPanels",
        "Tabs", "Tag", "Textarea", "Toast", "ToggleSwitch",
      ],
    },
    directives: { exclude: "*" },
    options: {
      theme: {
        preset: ScoreboardPreset,
        options: {
          prefix: "p",
          // The preset's colours switch through light-dark() CSS variables,
          // so PrimeVue's separate dark scheme is not used.
          darkModeSelector: "none",
          cssLayer: false,
        },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [{ name: "theme-color", content: "#0b0d11" }],
      // The page title, nav and body faces start downloading with the HTML rather
      // than after the stylesheet, so they are usually in before first paint and
      // the swap from the fallback does not shift the title band.
      link: [
        "Barlow_Condensed-normal-800-latin",
        "Barlow_Condensed-normal-700-latin",
        "Barlow-normal-400-latin",
      ].map((face) => ({ rel: "preload", as: "font", type: "font/woff2", href: `/fonts/${face}.woff2`, crossorigin: "anonymous" })),
    },
  },

  routeRules: {
    // The app used to live under /openvpf. Old links, QR codes and search results still point there.
    "/openvpf": { redirect: { to: "/", statusCode: 301 } },
    "/openvpf/**": { redirect: { to: "/**", statusCode: 301 } },
    "/vi/openvpf": { redirect: { to: "/vi", statusCode: 301 } },
    "/vi/openvpf/**": { redirect: { to: "/vi/**", statusCode: 301 } },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  // No cache routeRules, deliberately. A routeRule is keyed on the request URL
  // alone, with no notion of who asked, so any rule over an /api prefix will
  // eventually store one caller's response and replay it to another — hidden
  // meets from `?includeHidden=true`, an entry roster, a ban list. API caching
  // lives in server/service/ instead, where the code that caches a response is
  // the code that knows whether it is public.

  nitro: {
    prerender: {
      crawlLinks: false,
    },
    hooks: {
      async "prerender:routes"(routes) {
        // The container build runs without a reachable database (see Dockerfile),
        // so degrade gracefully: skip competition prerendering and let these
        // routes fall back to on-demand SSR + swr caching at runtime.
        try {
          const { getVisibleMeetSlugs } = await import("./server/repository/meet-slugs")
          const slugs = await getVisibleMeetSlugs()
          routes.add("/competitions")
          for (const slug of slugs) {
            routes.add(`/competitions/${slug}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[prerender] Skipping competition pages, could not load meet slugs: ${message}`)
        }
      },
    },
  },

  experimental: {
    // Prerendered competition pages inline their data instead of fetching a
    // separate _payload.json. With extraction on, the client did not know the
    // route was prerendered until the app manifest arrived, hydrated without
    // data and refetched, which emptied the list for a moment (CLS ~0.2).
    payloadExtraction: false,
  },

  devtools: {
    timeline: {
      enabled: true
    }
  }
})
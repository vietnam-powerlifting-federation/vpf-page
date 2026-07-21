import { defineNuxtConfig } from "nuxt/config"
import tailwindcss from "@tailwindcss/vite"
import Nora from "@primeuix/themes/nora"
import { definePreset } from "@primeuix/themes"

const MyPreset = definePreset(Nora, {
  semantic: {
    primary: {
      50: "{rose.50}",
      100: "{rose.100}",
      200: "{rose.200}",
      300: "{rose.300}",
      400: "{rose.400}",
      500: "{rose.500}",
      600: "{rose.600}",
      700: "{rose.700}",
      800: "{rose.800}",
      900: "{rose.900}",
      950: "{rose.950}"
    },
    colorScheme: {
      light: {
        surface: {
          0: "#ffffff",
          50: "{zinc.50}",
          100: "{zinc.100}",
          200: "{zinc.200}",
          300: "{zinc.300}",
          400: "{zinc.400}",
          500: "{zinc.500}",
          600: "{zinc.600}",
          700: "{zinc.700}",
          800: "{zinc.800}",
          900: "{zinc.900}",
          950: "{zinc.950}"
        }
      },
      dark: {
        surface: {
          0: "#ffffff",
          50: "{neutral.50}",
          100: "{neutral.100}",
          200: "{neutral.200}",
          300: "{neutral.300}",
          400: "{neutral.400}",
          500: "{neutral.500}",
          600: "{neutral.500}",
          700: "{neutral.600}",
          800: "{neutral.700}",
          900: "{neutral.800}",
          950: "{neutral.900}"
        }
      }
    }
  }
})

export default defineNuxtConfig({
  compatibilityDate: "2026-01-02",
  modules: [
    "@nuxt/test-utils/module",
    "@nuxt/eslint",
    "@nuxt/content",
    "@pinia/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/image",
    "nuxt-link-checker",
    "@primevue/nuxt-module",
  ],
  i18n: {
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "vi", language: "vi-VN", file: "vi.json" },
    ],
    defaultLocale: "en",
  },
  css: ["~/assets/styles/main.css", "~/assets/styles/vpf-components.css", "primeicons/primeicons.css"],
  primevue: {
    options: {
      theme: {
        preset: MyPreset,
        options: {
          prefix: "p",
          darkModeSelector: ".dark",
          cssLayer: false,
        }
      },
    }
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },

  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  routeRules: {
    // Only public, non-personalized OpenVPF pages are share-cached. The header's
    // auth UI is client-only (see components/OpenVPFHeader.vue), so nothing
    // user-specific is rendered server-side on these routes.
    //
    // Authenticated / user-specific pages (profile/**, checkout, admin/**,
    // athletes/**) are deliberately NOT cached: they render per-request so one
    // user's private data can never be baked into a response served to another.
    "/openvpf": { swr: 60 * 10 },
    "/openvpf/records": { swr: 60 * 10 },
    "/openvpf/competitions": { swr: 60 * 10 },
    "/openvpf/competitions/**": { swr: 60 * 10 },
    // Vietnamese locale variants (i18n prefix_except_default strategy).
    "/vi/openvpf": { swr: 60 * 10 },
    "/vi/openvpf/records": { swr: 60 * 10 },
    "/vi/openvpf/competitions": { swr: 60 * 10 },
    "/vi/openvpf/competitions/**": { swr: 60 * 10 },
    "/api/meets/**": {
      swr: 60 * 10
    },
    "/api/results": {
      swr: 60 * 10
    }
  },
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
          const { getVisibleMeetSlugs } = await import("./lib/utils/queries/meet-slugs")
          const slugs = await getVisibleMeetSlugs()
          routes.add("/openvpf/competitions")
          for (const slug of slugs) {
            routes.add(`/openvpf/competitions/${slug}`)
            routes.add(`/openvpf/competitions/${slug}/detailed`)
            routes.add(`/openvpf/competitions/${slug}/gl-ranking`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[prerender] Skipping competition pages, could not load meet slugs: ${message}`)
        }
      },
    },
  },
})
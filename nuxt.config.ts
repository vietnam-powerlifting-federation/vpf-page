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
          const { getVisibleMeetSlugs } = await import("./lib/utils/queries/meet-slugs")
          const slugs = await getVisibleMeetSlugs()
          routes.add("/openvpf/competitions")
          for (const slug of slugs) {
            routes.add(`/openvpf/competitions/${slug}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[prerender] Skipping competition pages, could not load meet slugs: ${message}`)
        }
      },
    },
  },

  devtools: {
    timeline: {
      enabled: true
    }
  }
})
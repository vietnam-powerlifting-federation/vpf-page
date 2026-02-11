import { defineNuxtConfig } from "nuxt/config"
import tailwindcss from "@tailwindcss/vite"
import Aura from "@primeuix/themes/aura"

export default defineNuxtConfig({
  compatibilityDate: "2026-01-02",
  modules: [
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxt/image",
    "@nuxtjs/color-mode",
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
  css: ["~/assets/styles/main.css", "~/assets/styles/volt.css", "~/assets/styles/vpf-components.css", "primeicons/primeicons.css"],
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          prefix: "p",
          darkModeSelector: "what",
          cssLayer: false
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
  }
})
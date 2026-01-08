import { defineNuxtConfig } from "nuxt/config"
import tailwindcss from "@tailwindcss/vite"
export default defineNuxtConfig({
  compatibilityDate: "2026-01-02",
  modules: [
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxt/image",
    "@nuxtjs/color-mode",
    "nuxt-link-checker",
    "@primevue/nuxt-module",
    "@nuxtjs/google-fonts",
  ],
  i18n: {
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "vi", language: "vi-VN", file: "vi.json" },
    ],
    defaultLocale: "en",
  },
  css: ["~/assets/styles/main.css", "~/assets/styles/volt.css", "primeicons/primeicons.css"],
  primevue: {
    options: {
      unstyled: true,
    }
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  }
})
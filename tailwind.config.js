/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["SVN-CenturyGothic", "Century Gothic", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        bg: "var(--p-surface-0)",
        "bg-dark": "var(--p-surface-900)",
        fg: "var(--p-surface-300)",
        error: "var(--red-400)"
      },
    },
  },
}

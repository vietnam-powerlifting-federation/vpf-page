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
        text: "var(--gray-800)",
        error: "var(--red-400)",
        highlight: "var(--primary)"
      },
    },
  },
}

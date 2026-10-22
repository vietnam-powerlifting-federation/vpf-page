import Aura from "@primeuix/themes/aura"
import { definePreset } from "@primeuix/themes"

/**
 * PrimeVue preset for the Scoreboard design (specs/frontend-redesign.md §3).
 *
 * Every colour points at a CSS variable from assets/styles/main.css. Those
 * variables switch between light and dark through light-dark(), so a surface
 * step means the same role in both schemes (surface.0 is always the panel
 * colour, surface.50 the page). Because of that, PrimeVue's own dark scheme is
 * switched off (`darkModeSelector: "none"` in nuxt.config.ts) and the light
 * scheme below is the only one.
 */

const surface = {
  0: "var(--vpf-surface)",
  50: "var(--vpf-paper)",
  100: "var(--vpf-raised)",
  200: "var(--vpf-line)",
  300: "var(--vpf-line-strong)",
  400: "var(--vpf-mid-1)",
  500: "var(--vpf-mid-2)",
  600: "var(--vpf-ink-2)",
  700: "var(--vpf-mid-3)",
  800: "var(--vpf-mid-4)",
  900: "var(--vpf-mid-5)",
  950: "var(--vpf-ink)",
}

const amber = {
  50: "color-mix(in oklch, var(--vpf-accent-soft) 50%, var(--vpf-surface))",
  100: "var(--vpf-accent-soft)",
  200: "color-mix(in oklch, var(--vpf-accent-soft) 50%, var(--vpf-accent-fill))",
  300: "var(--vpf-accent-fill-hover)",
  400: "var(--vpf-accent-fill-hover)",
  500: "var(--vpf-accent-fill)",
  600: "oklch(74% 0.15 80)",
  700: "var(--vpf-accent)",
  800: "oklch(42% 0.1 65)",
  900: "oklch(34% 0.08 65)",
  950: "oklch(24% 0.06 65)",
}

type Status = "success" | "info" | "warn" | "danger"

function statusMessage(status: Status) {
  return {
    background: `var(--vpf-${status}-soft)`,
    borderColor: `color-mix(in oklch, var(--vpf-${status}) 35%, transparent)`,
    color: `var(--vpf-${status})`,
    shadow: "none",
    closeButton: {
      hoverBackground: `color-mix(in oklch, var(--vpf-${status}) 12%, transparent)`,
      focusRing: { color: "var(--vpf-focus)", shadow: "none" },
    },
    outlined: { color: `var(--vpf-${status})`, borderColor: `var(--vpf-${status})` },
    simple: { color: `var(--vpf-${status})` },
  }
}

function statusToast(status: Status) {
  const { outlined: _o, simple: _s, ...rest } = statusMessage(status)
  return { ...rest, detailColor: "var(--vpf-ink)" }
}

function statusTextButton(status: Status) {
  return {
    hoverBackground: `var(--vpf-${status}-soft)`,
    activeBackground: `var(--vpf-${status}-soft)`,
    color: `var(--vpf-${status})`,
  }
}

const scheme = {
  surface,
  primary: {
    color: "var(--vpf-accent-fill)",
    contrastColor: "var(--vpf-on-accent)",
    hoverColor: "var(--vpf-accent-fill-hover)",
    activeColor: "var(--vpf-accent-fill-hover)",
  },
  highlight: {
    background: "var(--vpf-accent-soft)",
    focusBackground: "var(--vpf-accent-soft)",
    color: "var(--vpf-ink)",
    focusColor: "var(--vpf-ink)",
  },
  mask: {
    background: "var(--vpf-scrim)",
    color: "{surface.200}",
  },
  formField: {
    background: "{surface.0}",
    disabledBackground: "{surface.100}",
    filledBackground: "{surface.50}",
    filledHoverBackground: "{surface.50}",
    filledFocusBackground: "{surface.50}",
    borderColor: "{surface.300}",
    hoverBorderColor: "{surface.600}",
    focusBorderColor: "var(--vpf-focus)",
    invalidBorderColor: "var(--vpf-danger)",
    color: "{surface.950}",
    disabledColor: "{surface.600}",
    placeholderColor: "{surface.600}",
    invalidPlaceholderColor: "var(--vpf-danger)",
    floatLabelColor: "{surface.600}",
    floatLabelFocusColor: "{surface.950}",
    floatLabelActiveColor: "{surface.600}",
    floatLabelInvalidColor: "var(--vpf-danger)",
    iconColor: "{surface.600}",
    shadow: "none",
  },
  text: {
    color: "{surface.950}",
    hoverColor: "{surface.950}",
    mutedColor: "{surface.600}",
    hoverMutedColor: "{surface.700}",
  },
  content: {
    background: "{surface.0}",
    hoverBackground: "{surface.100}",
    borderColor: "{surface.200}",
    color: "{text.color}",
    hoverColor: "{text.hover.color}",
  },
}

export const ScoreboardPreset = definePreset(Aura, {
  primitive: {
    borderRadius: { none: "0", xs: "2px", sm: "4px", md: "4px", lg: "6px", xl: "6px" },
  },
  semantic: {
    transitionDuration: "120ms",
    focusRing: { width: "2px", style: "solid", color: "var(--vpf-focus)", offset: "2px", shadow: "none" },
    primary: amber,
    formField: {
      paddingX: "0.75rem",
      paddingY: "0.625rem",
      focusRing: { width: "2px", style: "solid", color: "var(--vpf-focus)", offset: "0", shadow: "none" },
    },
    colorScheme: {
      light: scheme,
      dark: scheme,
    },
  },
  components: {
    button: {
      root: {
        paddingY: "0.625rem",
        label: { fontWeight: "600" },
      },
      colorScheme: {
        light: {
          root: {
            primary: { focusRing: { color: "var(--vpf-focus)", shadow: "none" } },
            secondary: {
              background: "{surface.0}",
              hoverBackground: "{surface.100}",
              activeBackground: "{surface.100}",
              borderColor: "{surface.300}",
              hoverBorderColor: "{surface.600}",
              activeBorderColor: "{surface.600}",
              color: "{surface.950}",
              hoverColor: "{surface.950}",
              activeColor: "{surface.950}",
              focusRing: { color: "var(--vpf-focus)", shadow: "none" },
            },
            danger: {
              background: "var(--vpf-danger)",
              hoverBackground: "color-mix(in oklch, var(--vpf-danger) 88%, var(--vpf-ink))",
              activeBackground: "color-mix(in oklch, var(--vpf-danger) 80%, var(--vpf-ink))",
              borderColor: "var(--vpf-danger)",
              hoverBorderColor: "var(--vpf-danger)",
              activeBorderColor: "var(--vpf-danger)",
              color: "var(--vpf-surface)",
              hoverColor: "var(--vpf-surface)",
              activeColor: "var(--vpf-surface)",
              focusRing: { color: "var(--vpf-focus)", shadow: "none" },
            },
          },
          outlined: {
            primary: { hoverBackground: "var(--vpf-accent-soft)", activeBackground: "var(--vpf-accent-soft)", borderColor: "var(--vpf-accent)", color: "var(--vpf-accent)" },
            secondary: { hoverBackground: "{surface.100}", activeBackground: "{surface.100}", borderColor: "{surface.300}", color: "{surface.950}" },
            danger: { hoverBackground: "var(--vpf-danger-soft)", activeBackground: "var(--vpf-danger-soft)", borderColor: "var(--vpf-danger)", color: "var(--vpf-danger)" },
          },
          text: {
            primary: { hoverBackground: "var(--vpf-accent-soft)", activeBackground: "var(--vpf-accent-soft)", color: "var(--vpf-accent)" },
            secondary: { hoverBackground: "{surface.100}", activeBackground: "{surface.100}", color: "{surface.950}" },
            success: statusTextButton("success"),
            info: statusTextButton("info"),
            warn: statusTextButton("warn"),
            danger: statusTextButton("danger"),
          },
          link: { color: "var(--vpf-accent)", hoverColor: "var(--vpf-accent)", activeColor: "var(--vpf-accent)" },
        },
      },
    },
    message: {
      colorScheme: {
        light: {
          info: statusMessage("info"),
          success: statusMessage("success"),
          warn: statusMessage("warn"),
          error: statusMessage("danger"),
        },
      },
    },
    toast: {
      colorScheme: {
        light: {
          info: statusToast("info"),
          success: statusToast("success"),
          warn: statusToast("warn"),
          error: statusToast("danger"),
        },
      },
    },
    tag: {
      root: { fontWeight: "600" },
      colorScheme: {
        light: {
          primary: { background: "var(--vpf-accent-soft)", color: "var(--vpf-ink)" },
          secondary: { background: "{surface.100}", color: "{surface.950}" },
          success: { background: "var(--vpf-success-soft)", color: "var(--vpf-success)" },
          info: { background: "var(--vpf-info-soft)", color: "var(--vpf-info)" },
          warn: { background: "var(--vpf-warn-soft)", color: "var(--vpf-warn)" },
          danger: { background: "var(--vpf-danger-soft)", color: "var(--vpf-danger)" },
        },
      },
    },
    datatable: {
      headerCell: { color: "{surface.600}" },
      colorScheme: {
        light: {
          row: { stripedBackground: "{surface.50}" },
        },
      },
    },
    drawer: {
      root: { borderColor: "{surface.200}" },
    },
  },
})

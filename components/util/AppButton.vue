<template>
  <NuxtLinkLocale v-if="to" :to="to" :class="classes">
    <slot />
  </NuxtLinkLocale>
  <a v-else-if="href" :href="href" :class="classes" v-bind="download !== undefined ? { download } : {}">
    <slot />
  </a>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <AppIcon v-if="loading" name="lucide:loader-circle" class="size-4 motion-safe:animate-spin" />
    <slot />
  </button>
</template>

<script setup lang="ts">
/**
 * A button, or a link that looks like one, for the public pages. It replaces
 * PrimeVue's Button there so those routes do not load PrimeVue's runtime; the
 * account and admin screens keep PrimeVue.
 */
const props = withDefaults(defineProps<{
  variant?: "primary" | "secondary" | "text"
  to?: string
  href?: string
  download?: string
  type?: "button" | "submit"
  disabled?: boolean
  loading?: boolean
  block?: boolean
}>(), { variant: "primary", to: undefined, href: undefined, download: undefined, type: "button" })

const VARIANT = {
  primary: "bg-accent-fill text-on-accent hover:bg-accent-fill-hover",
  secondary: "border border-surface-300 bg-surface-0 text-color hover:bg-surface-100",
  text: "text-accent hover:bg-accent-soft",
}

const classes = computed(() => [
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded px-4 text-sm font-semibold whitespace-nowrap no-underline transition-colors duration-120 ease-snap active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45",
  VARIANT[props.variant],
  props.block && "w-full",
])
</script>

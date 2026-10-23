<template>
  <div class="p-4 md:p-8" :class="width && WIDTH_CLASS[width]">
    <NuxtLinkLocale v-if="backTo" :to="backTo" class="text-sm text-accent hover:underline">
      ← {{ backLabel }}
    </NuxtLinkLocale>

    <div class="mb-6 flex flex-wrap items-center gap-3" :class="backTo && 'mt-2'">
      <div class="min-w-0 flex-1">
        <h1 class="font-display text-3xl font-extrabold uppercase">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-muted-color" :class="mono && 'font-mono'">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
const WIDTH_CLASS = { "4xl": "max-w-4xl", "5xl": "max-w-5xl", "6xl": "max-w-6xl" } as const

/** The shell of every admin screen: padding, an optional back link, the title and subtitle, and header actions. */
defineProps<{
  title: string
  subtitle?: string
  /** Show the subtitle in a monospace face, for IDs. */
  mono?: boolean
  width?: keyof typeof WIDTH_CLASS
  backTo?: string
  backLabel?: string
}>()
</script>

<template>
  <div class="rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0 p-6 md:p-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="pt-[0.08em] font-display text-[2rem] leading-[1.05] font-extrabold uppercase">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-muted-color">{{ subtitle }}</p>
      </div>
      <LangSwitch class="shrink-0" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-6 border-t border-surface-200 pt-5 text-center text-sm">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
/** The single centred card of the auth pages: title, subtitle, language switch, the form, and a footer link. */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div
    class="overflow-hidden rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0"
    :class="image && 'md:grid md:grid-cols-2'"
  >
    <div class="p-6 md:p-8" :class="image && 'lg:p-10'">
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
    <!-- Decorative photo beside the form; hidden on phones so the form comes first. -->
    <img
      v-if="image"
      :src="image"
      alt=""
      width="540"
      height="650"
      decoding="async"
      class="hidden size-full object-cover md:block"
    >
  </div>
</template>

<script setup lang="ts">
/**
 * The card of the auth pages: title, subtitle, language switch, the form, and a
 * footer link. With `image`, the card splits into the form on the left and the
 * photo on the right from 768px (pages using it set `definePageMeta({ wide: "split" })`).
 */
defineProps<{ title: string; subtitle?: string; image?: string }>()
</script>

<template>
  <section
    class="min-w-0 rounded-md border border-surface-200 bg-surface-0"
    :class="[ruled && 'border-t-[3px] border-t-ink', flush ? '' : 'p-4 md:p-6']"
    :aria-labelledby="title ? titleId : undefined"
  >
    <header v-if="title || $slots.actions" class="mb-4 flex flex-wrap items-start justify-between gap-3" :class="flush && 'px-4 pt-4 md:px-6 md:pt-6'">
      <div class="min-w-0">
        <h2 v-if="title" :id="titleId" class="font-display text-xl font-bold tracking-[0.02em] uppercase">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-muted-color">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
/** A content panel on the page: surface, hairline border, optional title and actions. `ruled` adds the 3px ink top rule. */
defineProps<{ title?: string; description?: string; ruled?: boolean; flush?: boolean }>()
const titleId = useId()
</script>

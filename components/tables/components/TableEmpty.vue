<template>
  <div class="px-4 py-12 text-center">
    <h2 class="font-display text-[1.375rem] font-bold uppercase">{{ title }}</h2>
    <p v-if="body" class="mx-auto mt-2 mb-4 max-w-[40ch] text-muted-color">{{ body }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
/** Empty state: a heading, one plain sentence, and usually a Reset button in the slot. */
defineProps<{ title: string; body?: string }>()
</script>

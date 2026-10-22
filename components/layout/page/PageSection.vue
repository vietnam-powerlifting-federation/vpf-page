<template>
  <div class="mx-auto w-full max-w-page px-4 md:px-6" :class="flush ? '' : 'py-6 md:py-8'">
    <slot />
  </div>
</template>

<script setup lang="ts">
/** The content column below the title band: page width and gutters. */
defineProps<{ flush?: boolean }>()
</script>

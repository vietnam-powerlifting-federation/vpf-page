<template>
  <Icon :name="name" aria-hidden="true" class="shrink-0" />
</template>

<script setup lang="ts">
/**
 * A decorative icon. Pass the full name ("lucide:search") so the icon bundler
 * can find it in the source. Icon-only buttons put their label on the button.
 */
defineProps<{ name: string }>()
</script>

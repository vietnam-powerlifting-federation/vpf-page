<template>
  <div class="flex items-center justify-center gap-3 py-12 text-muted-color" role="status">
    <ProgressSpinner class="!m-0 !size-6" stroke-width="6" />
    <span>{{ label ?? $t("general.loading") }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

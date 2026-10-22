<template>
  <div aria-hidden="true">
    <div class="h-12 bg-board" />
    <div v-for="r in rows" :key="r" class="flex items-center gap-4 border-b border-surface-200 px-3 py-4 last:border-b-0">
      <span class="size-8 shrink-0 rounded bg-surface-100" />
      <span class="h-4 w-40 shrink-0 rounded bg-surface-100" />
      <span v-for="c in columns" :key="c" class="ml-auto h-4 w-14 rounded bg-surface-100" />
    </div>
  </div>
</template>

<script setup lang="ts">
/** Static placeholder rows while the first page of a table loads. */
withDefaults(defineProps<{ rows?: number; columns?: number }>(), { rows: 8, columns: 4 })
</script>

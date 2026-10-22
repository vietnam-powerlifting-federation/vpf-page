<template>
  <input
    v-model="model"
    :aria-invalid="invalid || undefined"
    class="min-h-11 w-full rounded border bg-surface-0 px-3 py-2 text-base text-color transition-colors duration-120 ease-snap placeholder:text-muted-color hover:border-surface-600 focus-visible:border-focus focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-muted-color"
    :class="invalid ? 'border-danger' : 'border-surface-300'"
  >
</template>

<script setup lang="ts">
/** A native text input styled with the tokens, for the public and auth pages. Attributes fall through. */
defineProps<{ invalid?: boolean }>()
const model = defineModel<string>({ default: "" })
</script>

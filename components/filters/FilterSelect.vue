<template>
  <div class="grid min-w-0 grid-cols-1 content-start gap-1">
    <label :for="id" class="font-display text-[0.9375rem] font-bold tracking-[0.06em] uppercase">{{ label }}</label>
    <NativeSelect :id="id" :model-value="modelValue" :options="options" :grouped="grouped" :aria-describedby="hint ? hintId : undefined" @update:model-value="emit('update:modelValue', $event)" />
    <span v-if="hint" :id="hintId" class="text-[0.8125rem] text-muted-color">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
type Option = { label: string; value: string }
type Group = { label: string; items: Option[] }

/** A filter select with a visible label. Pass `grouped` when options are `{ label, items }` groups. */
defineProps<{
  modelValue: string
  label: string
  options: Option[] | Group[]
  grouped?: boolean
  hint?: string
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const id = useId()
const hintId = useId()
</script>

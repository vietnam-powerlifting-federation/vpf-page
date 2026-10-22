<template>
  <div class="grid min-w-0 grid-cols-1 content-start gap-1">
    <label :id="labelId" class="font-display text-[0.9375rem] font-bold tracking-[0.06em] uppercase">{{ label }}</label>
    <Select
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :option-group-label="grouped ? 'label' : undefined"
      :option-group-children="grouped ? 'items' : undefined"
      :placeholder="placeholder"
      :aria-labelledby="labelId"
      :aria-describedby="hint ? hintId : undefined"
      class="min-h-11 w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <span v-if="hint" :id="hintId" class="text-[0.8125rem] text-muted-color">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
type Option = { label: string; value: string }
type Group = { label: string; items: Option[] }

/** PrimeVue Select with a visible label. Pass `grouped` when options are `{ label, items }` groups. */
defineProps<{
  modelValue: string
  label: string
  options: Option[] | Group[]
  grouped?: boolean
  hint?: string
  /** Shown when the value matches no option, which is how PrimeVue treats "" ("All"). */
  placeholder?: string
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const labelId = useId()
const hintId = useId()
</script>

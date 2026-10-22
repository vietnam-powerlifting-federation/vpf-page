<template>
  <fieldset class="m-0 grid min-w-0 grid-cols-1 content-start gap-1 border-0 p-0">
    <legend class="mb-1 p-0 font-display text-[0.9375rem] font-bold tracking-[0.06em] uppercase">{{ legend }}</legend>
    <div class="flex rounded border border-surface-300 bg-surface-50 p-0.5">
      <label v-for="option in options" :key="option.value" class="relative flex-1">
        <input
          type="radio"
          :name="name"
          :value="option.value"
          :checked="modelValue === option.value"
          class="peer absolute inset-0 m-0 cursor-pointer opacity-0"
          @change="emit('update:modelValue', option.value)"
        >
        <span
          class="flex min-h-[38px] items-center justify-center rounded-[2px] px-3 text-sm font-medium whitespace-nowrap text-muted-color transition-colors duration-120 ease-snap peer-hover:text-color peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-focus"
        >{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
/** A small radio group drawn as joined buttons; the checked one is filled with ink. */
defineProps<{
  modelValue: string
  legend: string
  options: { value: string; label: string }[]
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const name = useId()
</script>

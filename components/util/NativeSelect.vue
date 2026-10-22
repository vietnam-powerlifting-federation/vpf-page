<template>
  <div class="relative min-w-0">
    <select
      v-bind="$attrs"
      :value="String(modelValue)"
      class="min-h-11 w-full cursor-pointer appearance-none rounded border border-surface-300 bg-surface-50 py-2 pr-9 pl-3 text-base text-color transition-colors duration-120 ease-snap hover:border-surface-600 focus-visible:border-focus focus-visible:outline-offset-0"
      :class="compact && 'min-h-10 text-sm'"
      @change="onChange"
    >
      <template v-if="grouped">
        <optgroup v-for="group in options as Group[]" :key="group.label" :label="group.label">
          <option v-for="option in group.items" :key="option.value" :value="String(option.value)" :selected="option.value === modelValue">{{ option.label }}</option>
        </optgroup>
      </template>
      <template v-else>
        <option v-for="option in options as Option[]" :key="option.value" :value="String(option.value)" :selected="option.value === modelValue">{{ option.label }}</option>
      </template>
    </select>
    <AppIcon name="lucide:chevron-down" class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-color" />
  </div>
</template>

<script setup lang="ts" generic="V extends string | number">
type Option = { label: string; value: V }
type Group = { label: string; items: Option[] }

/**
 * The browser's own <select>, styled with the tokens. It replaces PrimeVue's
 * Select on the public pages: no extra JavaScript, and the platform picker on
 * phones. Attributes (id, aria-*) fall through to the <select>.
 */
defineOptions({ inheritAttrs: false })
const props = defineProps<{ modelValue: V; options: Option[] | Group[]; grouped?: boolean; compact?: boolean }>()
const emit = defineEmits<{ "update:modelValue": [value: V] }>()

function onChange(event: Event) {
  const raw = (event.target as HTMLSelectElement).value
  emit("update:modelValue", (typeof props.modelValue === "number" ? Number(raw) : raw) as V)
}
</script>

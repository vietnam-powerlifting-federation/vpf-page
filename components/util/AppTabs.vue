<template>
  <div>
    <div role="tablist" :aria-label="label" class="flex overflow-x-auto overflow-y-hidden border-b border-surface-200" @keydown="onKeydown">
      <button
        v-for="tab in tabs"
        :id="`${id}-tab-${tab.value}`"
        :key="tab.value"
        ref="buttons"
        type="button"
        role="tab"
        :aria-selected="tab.value === modelValue"
        :aria-controls="`${id}-panel-${tab.value}`"
        :tabindex="tab.value === modelValue ? 0 : -1"
        class="-mb-px min-h-12 shrink-0 cursor-pointer border-b-[3px] px-4 font-display text-base font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-colors duration-120 ease-snap focus-visible:-outline-offset-2"
        :class="tab.value === modelValue ? 'border-accent-fill text-color' : 'border-transparent text-muted-color hover:text-color'"
        @click="emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <!-- A panel renders the first time its tab is opened, then stays mounted. -->
    <template v-for="tab in tabs" :key="tab.value">
      <div
        v-if="visited.has(tab.value)"
        v-show="tab.value === modelValue"
        :id="`${id}-panel-${tab.value}`"
        role="tabpanel"
        :aria-labelledby="`${id}-tab-${tab.value}`"
        tabindex="0"
        class="pt-6 focus-visible:outline-offset-4"
      >
        <slot :name="tab.value" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/** Tabs with the WAI-ARIA tab pattern: arrow keys, Home and End move between tabs. */
const props = defineProps<{ tabs: { value: string; label: string }[]; modelValue: string; label: string }>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const id = useId()
const buttons = ref<HTMLButtonElement[]>([])
const visited = ref(new Set<string>([props.modelValue]))
watch(() => props.modelValue, (value) => visited.value.add(value))

function onKeydown(event: KeyboardEvent) {
  const index = props.tabs.findIndex((tab) => tab.value === props.modelValue)
  const last = props.tabs.length - 1
  const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key]
  if (next === undefined) return
  event.preventDefault()
  emit("update:modelValue", props.tabs[next]!.value)
  nextTick(() => buttons.value[next]?.focus())
}
</script>

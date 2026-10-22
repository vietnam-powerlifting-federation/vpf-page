<template>
  <div class="grid min-w-0 grid-cols-1 content-start gap-1">
    <label :for="id" class="font-display text-[0.9375rem] font-bold tracking-[0.06em] uppercase">{{ label }}</label>
    <div class="relative">
      <AppIcon name="lucide:search" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-color" />
      <input
        :id="id"
        ref="input"
        v-model="draft"
        type="search"
        autocomplete="off"
        spellcheck="false"
        :placeholder="placeholder"
        :aria-describedby="hint ? hintId : undefined"
        class="min-h-12 w-full rounded border border-surface-300 bg-surface-50 pr-11 pl-10 text-base transition-colors duration-120 ease-snap placeholder:text-muted-color hover:border-surface-600 focus-visible:border-focus focus-visible:outline-offset-0"
        @keydown.esc="clear"
      >
      <button
        v-show="draft"
        type="button"
        class="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-color hover:text-color"
        :aria-label="clearLabel"
        @click="clear"
      >
        <AppIcon name="lucide:x" class="size-5" />
      </button>
    </div>
    <span v-if="hint" :id="hintId" class="text-[0.8125rem] text-muted-color">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
/** Search input with a visible label, clear button and hint. Emits after a 120ms pause in typing. */
const props = defineProps<{
  modelValue: string
  label: string
  clearLabel: string
  placeholder?: string
  hint?: string
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const id = useId()
const hintId = useId()
const input = ref<HTMLInputElement | null>(null)
const draft = ref(props.modelValue)

let timer: ReturnType<typeof setTimeout> | undefined
watch(draft, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => emit("update:modelValue", value), 120)
})
watch(() => props.modelValue, (value) => {
  if (value !== draft.value) draft.value = value
})
onBeforeUnmount(() => clearTimeout(timer))

function clear() {
  clearTimeout(timer)
  draft.value = ""
  emit("update:modelValue", "")
  input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div ref="root" class="grid min-w-0 grid-cols-1 content-start gap-1" @keydown.esc="close">
    <span :id="labelId" class="font-display text-[0.9375rem] font-bold tracking-[0.06em] uppercase">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="relative flex min-h-11 w-full cursor-pointer items-center rounded border border-surface-300 bg-surface-50 py-2 pr-9 pl-3 text-left text-base text-color transition-colors duration-120 ease-snap hover:border-surface-600 focus-visible:border-focus focus-visible:outline-offset-0"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-labelledby="labelId"
      @click="toggleOpen"
    >
      <span class="truncate">{{ summary }}</span>
      <AppIcon name="lucide:chevron-down" class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-color" />
    </button>
    <!-- Fixed, so the scrolling filter row cannot clip it. -->
    <ul
      v-if="open"
      role="listbox"
      aria-multiselectable="true"
      :aria-labelledby="labelId"
      class="fixed z-50 grid gap-0.5 rounded border border-surface-300 bg-surface-0 p-1 shadow-lg"
      :style="panelStyle"
    >
      <li v-for="option in options" :key="option.value" role="option" :aria-selected="modelValue.includes(option.value)">
        <label class="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm whitespace-nowrap hover:bg-surface-100">
          <input type="checkbox" class="size-4 accent-[var(--color-accent-fill)]" :checked="modelValue.includes(option.value)" @change="toggle(option.value)">
          {{ option.label }}
        </label>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/** A dropdown for picking several values; an empty selection reads as `placeholder` (all). */
const props = defineProps<{
  modelValue: string[]
  label: string
  placeholder: string
  options: { value: string; label: string }[]
}>()
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>()

const labelId = useId()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const open = ref(false)
const panelStyle = ref<Record<string, string>>({})

const summary = computed(() => {
  const picked = props.options.filter((o) => props.modelValue.includes(o.value))
  return picked.length ? picked.map((o) => o.label).join(", ") : props.placeholder
})

function toggleOpen() {
  if (open.value) return close()
  const rect = trigger.value!.getBoundingClientRect()
  panelStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px`, minWidth: `${rect.width}px` }
  open.value = true
}

function close() {
  open.value = false
}

function toggle(value: string) {
  emit("update:modelValue", props.modelValue.includes(value) ? props.modelValue.filter((v) => v !== value) : [...props.modelValue, value])
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close()
}

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown)
  // A fixed panel would drift from its button, so any scroll or resize closes it.
  window.addEventListener("scroll", close, true)
  window.addEventListener("resize", close)
})
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown)
  window.removeEventListener("scroll", close, true)
  window.removeEventListener("resize", close)
})
</script>

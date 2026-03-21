<template>
  <div
    class="rounded-full p-1 flex-shrink-0"
    :style="borderStyle"
  >
    <div class="rounded-full overflow-hidden bg-surface-900 w-full h-full">
      <img :src="src" class="w-full h-full object-cover" alt="Avatar" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  src: string
  decorator1?: string | null
  decorator2?: string | null
}>()

const borderStyle = computed(() => {
  const c1 = props.decorator1 || "var(--p-primary-color)"
  const c2 = props.decorator2 || "var(--p-primary-color)"
  return { background: `linear-gradient(to bottom right, ${c1}, ${c2})` }
})
</script>

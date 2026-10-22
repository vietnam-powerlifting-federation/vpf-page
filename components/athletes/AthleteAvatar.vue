<template>
  <!-- The ring takes the athlete's VIP colours; amber when they chose none. -->
  <div class="shrink-0 rounded-full p-1" :class="!hasColours && 'bg-accent-fill'" :style="ringStyle">
    <img :src="src" :alt="alt" :width="size" :height="size" class="aspect-square size-full rounded-full bg-board-2 object-cover">
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string
  alt?: string
  decorator1?: string | null
  decorator2?: string | null
  /** Intrinsic size for the img element, so the layout is reserved before it loads. */
  size?: number
}>(), { alt: "", decorator1: null, decorator2: null, size: 160 })

const hasColours = computed(() => !!(props.decorator1 || props.decorator2))
const ringStyle = computed(() => {
  if (!hasColours.value) return {}
  const from = props.decorator1 || props.decorator2
  const to = props.decorator2 || props.decorator1
  return { backgroundImage: `linear-gradient(to bottom right, ${from}, ${to})` }
})
</script>

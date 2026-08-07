<template>
  <div ref="el">
    <slot v-if="visible" />
    <div v-else class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded" :style="{ height: placeholderHeight }" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  placeholderHeight: string
}>()

const el = ref<HTMLElement | null>(null)
const visible = ref(false)

onMounted(() => {
  if (!el.value) return

  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      visible.value = true
      observer.disconnect()
    }
  }, { rootMargin: "600px 0px" })

  observer.observe(el.value)
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--vpf-accent-fill)" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Toasts only report background results, so the component loads after the page is idle. -->
  <LazyToast v-if="toastReady" />
</template>

<script setup lang="ts">
const toastReady = ref(false)
onMounted(() => {
  const ready = () => { toastReady.value = true }
  if ("requestIdleCallback" in window) window.requestIdleCallback(ready, { timeout: 2000 })
  else setTimeout(ready, 1000)
})

// <html lang> and hreflang links follow the active locale.
const head = useLocaleHead()
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: head.value.link,
  titleTemplate: (title?: string) => (title ? `${title} · VPF` : "VPF"),
}))
</script>

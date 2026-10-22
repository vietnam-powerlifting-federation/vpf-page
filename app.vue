<template>
  <NuxtLoadingIndicator color="var(--vpf-accent-fill)" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toast />
</template>

<script setup lang="ts">
// <html lang> and hreflang links follow the active locale.
const head = useLocaleHead()
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: head.value.link,
  titleTemplate: (title?: string) => (title ? `${title} · VPF` : "VPF"),
}))
</script>

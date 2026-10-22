<template>
  <div class="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex flex-1 items-start justify-center px-4 py-8 focus:outline-none md:py-16">
      <!-- Page meta `wide`: true for long forms (identity verification), "split" for a card with a photo (login). -->
      <div class="w-full" :class="route.meta.wide === 'split' ? 'max-w-md md:max-w-5xl' : route.meta.wide ? 'max-w-2xl' : 'max-w-md'">
        <slot />
      </div>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>

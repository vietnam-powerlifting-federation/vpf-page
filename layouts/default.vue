<template>
  <div class="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex-1 focus:outline-none">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

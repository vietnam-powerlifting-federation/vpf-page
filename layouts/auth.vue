<template>
  <div class="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex flex-1 items-start justify-center px-4 py-8 focus:outline-none md:py-16">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </main>
    <SiteFooter />
  </div>
</template>

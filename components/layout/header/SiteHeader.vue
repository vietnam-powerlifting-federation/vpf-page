<template>
  <header class="sticky top-0 z-40 border-b border-board-line bg-board text-board-ink">
    <div class="mx-auto flex min-h-16 w-full max-w-page items-center gap-4 px-4 md:px-6">
      <NuxtLinkLocale to="/" class="inline-flex min-w-0 items-center gap-2 rounded no-underline" :aria-label="$t('site.home')">
        <BrandMark />
        <span class="flex min-w-0 flex-col leading-[1.1]" aria-hidden="true">
          <strong class="font-display text-2xl font-extrabold tracking-[0.04em]">{{ $t("site.short") }}</strong>
          <span class="hidden text-[0.6875rem] tracking-[0.08em] text-board-ink-2 uppercase wm:block">{{ $t("site.federation") }}</span>
        </span>
      </NuxtLinkLocale>

      <MainNav />

      <div class="ml-auto flex items-center gap-1 nav:ml-0">
        <div class="hidden items-center gap-1 nav:flex">
          <LangSwitch on-board />
          <ThemeToggle />
        </div>

        <!--
          Who is signed in is only known in the browser: competition pages are
          prerendered, and that HTML is shared by every visitor.
        -->
        <ClientOnly>
          <template #fallback>
            <span class="inline-block h-11 w-24" aria-hidden="true" />
          </template>
          <UserMenu v-if="isLoggedIn" />
          <NuxtLinkLocale
            v-else
            to="/login"
            class="inline-flex min-h-11 items-center rounded bg-accent-fill px-4 font-display text-base font-bold tracking-[0.05em] whitespace-nowrap text-on-accent uppercase no-underline transition-colors duration-120 ease-snap hover:bg-accent-fill-hover"
          >
            {{ $t("nav.login") }}
          </NuxtLinkLocale>
        </ClientOnly>

        <button
          ref="menuButton"
          type="button"
          class="grid size-11 cursor-pointer place-items-center rounded text-board-ink transition-colors duration-120 ease-snap hover:bg-board-2 nav:hidden"
          aria-haspopup="dialog"
          :aria-expanded="menuOpen"
          :aria-label="$t('nav.openMenu')"
          @click="menuOpen = true"
        >
          <AppIcon name="lucide:menu" class="size-5" />
        </button>
      </div>
    </div>
    <MobileNav v-model:visible="menuOpen" @closed="menuButton?.focus()" />
  </header>
</template>

<script setup lang="ts">
const { isLoggedIn, refresh } = useAuthSession()
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)

// Read the session in the browser so it reflects this visitor's cookie.
onMounted(refresh)
</script>

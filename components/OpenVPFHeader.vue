<template>
  <header class="profile-header border-b border-surface-700">
    <div class="container mx-auto px-4 grid grid-cols-[auto_minmax(0,1fr)_auto] md:flex items-center h-14 gap-2">
      <Button
        type="button"
        icon="pi pi-bars"
        text
        rounded
        severity="secondary"
        class="md:hidden! justify-self-start"
        :aria-label="$t('openvpf.headerNav.openNavigation')"
        @click="mobileNavOpen = true"
      />

      <NuxtLinkLocale
        to="/"
        class="min-w-0 justify-self-center md:justify-self-auto hidden md:flex items-center gap-2 text-primary font-semibold text-base md:text-lg shrink md:shrink-0"
      >
        <span class="truncate">{{ $t("home.title") }}</span>
      </NuxtLinkLocale>

      <nav class="hidden md:flex items-center gap-6 flex-1 justify-center">
        <NuxtLinkLocale
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
        >
          {{ $t(item.label) }}
        </NuxtLinkLocale>
      </nav>

      <!--
        Auth-dependent UI is rendered client-only: these routes use swr caching
        (see nuxt.config routeRules "/openvpf/**") and prerendering, so the SSR
        HTML is shared across users and must not depend on the current session.
        Rendering only on the client keeps the cached markup auth-agnostic and
        avoids hydration mismatches.
      -->
      <ClientOnly>
        <template #fallback>
          <div class="justify-self-end shrink-0 w-8 h-8" aria-hidden="true" />
        </template>

        <div v-if="isLoggedIn" ref="menuRef" class="relative justify-self-end shrink-0">
          <Button
            type="button"
            text
            rounded
            severity="secondary"
            class="flex items-center gap-2 text-surface-200 hover:text-surface-0"
            :aria-label="$t('openvpf.headerNav.openUserMenu')"
            @click="open = !open"
          >
            <span class="hidden md:inline text-sm font-medium">{{ athleteName }}</span>
            <img v-if="avatarUrl" :src="avatarUrl" class="w-8 h-8 rounded-lg" alt="">
            <i v-else class="pi pi-user text-base" />
          </Button>

          <div
            v-if="open"
            class="absolute right-0 top-full mt-2 w-52 rounded-lg border border-surface-700 bg-surface-900 shadow-lg py-1 z-50"
          >
            <NuxtLinkLocale
              to="/openvpf/athletes/self"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-0"
              @click="open = false"
            >
              <i class="pi pi-user text-sm" />
              {{ $t("openvpf.headerNav.viewProfile") }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
              to="/openvpf/profile"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-0"
              @click="open = false"
            >
              <i class="pi pi-cog text-sm" />
              {{ $t("openvpf.headerNav.profileSettings") }}
            </NuxtLinkLocale>
            <div class="my-1 border-t border-surface-700" />
            <Button
              type="button"
              text
              severity="secondary"
              class="w-full justify-start rounded-none flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-0"
              @click="signOut"
            >
              <i class="pi pi-sign-out text-sm" />
              {{ $t("openvpf.headerNav.signOut") }}
            </Button>
          </div>
        </div>

        <NuxtLinkLocale
          v-else
          to="/login"
          class="justify-self-end bg-primary text-primary-contrast px-3 md:px-4 py-2 rounded font-medium text-sm hover:opacity-90 shrink-0 whitespace-nowrap"
        >
          {{ $t("login.loginButton") }}
        </NuxtLinkLocale>
      </ClientOnly>
    </div>

    <Drawer v-model:visible="mobileNavOpen" position="left" :header="$t('home.title')" class="!w-80 max-w-[85vw]">
      <nav class="flex flex-col gap-2">
        <NuxtLinkLocale
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-4 py-3 text-sm font-medium uppercase tracking-wide text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800 dark:hover:text-surface-0"
          @click="mobileNavOpen = false"
        >
          {{ $t(item.label) }}
        </NuxtLinkLocale>
      </nav>
    </Drawer>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"

const navItems = [
  { to: "/openvpf", label: "openvpf.headerNav.rankings" },
  { to: "/openvpf/records", label: "openvpf.headerNav.records" },
  { to: "/openvpf/competitions", label: "openvpf.headerNav.competitions" },
  { to: "/contact", label: "openvpf.headerNav.contact" },
] as const

const { athlete, isLoggedIn, refresh: refreshSession } = useAuthSession()
const athleteName = computed(() => athlete.value?.athlete?.fullName ?? "")
const avatarUrl = computed(() => athlete.value?.vipSettings?.avatarImageUrl ?? null)

const localePath = useLocalePath()
const router = useRouter()

const open = ref(false)
const mobileNavOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
let desktopMediaQuery: MediaQueryList | null = null

function onDocumentClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

function onDesktopMediaChange(e: MediaQueryList | MediaQueryListEvent) {
  if (e.matches) {
    mobileNavOpen.value = false
  }
}

onMounted(() => {
  // Resolve the session on the client so it reflects the current visitor's
  // cookie rather than any swr-cached page payload.
  refreshSession()
  document.addEventListener("click", onDocumentClick, true)
  desktopMediaQuery = window.matchMedia("(min-width: 768px)")
  onDesktopMediaChange(desktopMediaQuery)
  desktopMediaQuery.addEventListener("change", onDesktopMediaChange)
})

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick, true)
  desktopMediaQuery?.removeEventListener("change", onDesktopMediaChange)
})

async function signOut() {
  await $fetch("/api/auth/logout", { method: "POST" })
  athlete.value = null
  open.value = false
  router.push(localePath("/login"))
}
</script>

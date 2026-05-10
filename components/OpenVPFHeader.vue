<template>
  <header class="profile-header border-b border-surface-700">
    <div class="container mx-auto px-4 flex items-center h-14">
      <NuxtLinkLocale to="/" class="flex items-center gap-2 text-primary font-semibold text-lg shrink-0">
        <span>{{ $t("home.title") }}</span>
      </NuxtLinkLocale>

      <nav class="flex items-center gap-6 flex-1 justify-center">
        <NuxtLinkLocale
          to="/openvpf"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
        >
          {{ $t("openvpf.headerNav.rankings") }}
        </NuxtLinkLocale>

        <NuxtLinkLocale
          to="/openvpf/records"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
        >
          {{ $t("openvpf.headerNav.records") }}
        </NuxtLinkLocale>

        <NuxtLinkLocale
          to="/openvpf/competitions"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
        >
          {{ $t("openvpf.headerNav.competitions") }}
        </NuxtLinkLocale>

        <NuxtLinkLocale
          to="/contact"
          class="text-surface-300 hover:text-surface-0 text-sm font-medium uppercase tracking-wide"
        >
          {{ $t("openvpf.headerNav.contact") }}
        </NuxtLinkLocale>
      </nav>

      <div v-if="isLoggedIn" ref="menuRef" class="relative shrink-0">
        <button
          class="flex items-center gap-2 text-surface-200 hover:text-surface-0"
          @click="open = !open"
        >
          <span class="text-sm font-medium">{{ athleteName }}</span>
          <img v-if="avatarUrl" :src="avatarUrl" class="w-8 h-8 rounded-lg" alt="">
          <i v-else class="pi pi-user text-base" />
        </button>

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
          <button
            class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-surface-200 hover:bg-surface-800 hover:text-surface-0"
            @click="signOut"
          >
            <i class="pi pi-sign-out text-sm" />
            {{ $t("openvpf.headerNav.signOut") }}
          </button>
        </div>
      </div>

      <NuxtLinkLocale
        v-else
        to="/login"
        class="bg-primary text-primary-contrast px-4 py-2 rounded font-medium text-sm hover:opacity-90 shrink-0"
      >
        {{ $t("login.loginButton") }}
      </NuxtLinkLocale>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import type { ApiResponse } from "~/types/api"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

type AthleteResponse = { athlete: UserPublic; vipSettings?: VipBenefits }

const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined
const { data } = await useFetch<ApiResponse<AthleteResponse>>("/api/athletes/self", {
  ignoreResponseError: true,
  credentials: "include",
  headers,
  query: { includeVipSettings: true },
})

const isLoggedIn = computed(() => data.value?.success === true)
const athleteName = computed(() => data.value?.data?.athlete?.fullName ?? "")
const avatarUrl = computed(() => data.value?.data?.vipSettings?.avatarImageUrl ?? null)

const localePath = useLocalePath()
const router = useRouter()

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick, true))
onUnmounted(() => document.removeEventListener("click", onDocumentClick, true))

async function signOut() {
  await $fetch("/api/auth/logout", { method: "POST" })
  router.push(localePath("/login"))
}
</script>

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

      <NuxtLinkLocale
        v-if="isLoggedIn"
        to="/openvpf/athletes/self"
        class="flex items-center gap-2 text-surface-200 hover:text-surface-0 shrink-0"
      >
        <span class="text-sm font-medium">{{ athleteName }}</span>
        <img v-if="avatarUrl" :src="avatarUrl" class="w-8 h-8 rounded-lg" alt="">
        <i v-else class="pi pi-user text-base" />
      </NuxtLinkLocale>

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
</script>

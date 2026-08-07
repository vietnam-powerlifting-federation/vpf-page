<template>
  <div class="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950">
    <OpenVPFHeader />

    <div class="flex-1 flex">
      <!-- Persistent sidebar (§1.1). The two tools that already existed were
           reachable only by typing their URL; this is the whole point of it. -->
      <aside class="hidden lg:flex w-60 shrink-0 flex-col border-r border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900">
        <div class="px-4 py-4 border-b border-surface-200 dark:border-surface-800">
          <NuxtLinkLocale to="/openvpf/admin" class="text-sm font-semibold uppercase tracking-wide text-primary">
            {{ $t("admin.nav.console") }}
          </NuxtLinkLocale>
        </div>
        <nav class="flex-1 overflow-y-auto py-2">
          <div v-for="group in navGroups" :key="group.label" class="mb-4">
            <p class="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
              {{ $t(group.label) }}
            </p>
            <NuxtLinkLocale
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
              active-class="bg-primary-50 dark:bg-surface-800 text-primary font-medium"
            >
              <i :class="item.icon" class="text-sm w-4" />
              {{ $t(item.label) }}
            </NuxtLinkLocale>
          </div>
        </nav>
      </aside>

      <!-- Same nav in a drawer below lg. -->
      <Drawer v-model:visible="mobileNavOpen" position="left" :header="$t('admin.nav.console')" class="!w-72">
        <nav>
          <div v-for="group in navGroups" :key="group.label" class="mb-4">
            <p class="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
              {{ $t(group.label) }}
            </p>
            <NuxtLinkLocale
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 px-2 py-2.5 text-sm rounded text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
              @click="mobileNavOpen = false"
            >
              <i :class="item.icon" class="text-sm w-4" />
              {{ $t(item.label) }}
            </NuxtLinkLocale>
          </div>
        </nav>
      </Drawer>

      <main class="flex-1 min-w-0">
        <div class="lg:hidden border-b border-surface-200 dark:border-surface-800 px-4 py-2">
          <Button
            icon="pi pi-bars"
            text
            severity="secondary"
            :label="$t('admin.nav.console')"
            @click="mobileNavOpen = true"
          />
        </div>
        <slot />
      </main>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

/** Mirrors the document this console was built from: Meets · Athletes · Money. */
const navGroups = [
  {
    label: "admin.nav.meets",
    items: [
      { to: "/openvpf/admin", label: "admin.nav.dashboard", icon: "pi pi-inbox" },
      { to: "/openvpf/admin/meets", label: "admin.nav.meetList", icon: "pi pi-calendar" },
    ],
  },
  {
    label: "admin.nav.athletes",
    items: [
      { to: "/openvpf/admin/athletes", label: "admin.nav.athleteList", icon: "pi pi-users" },
      { to: "/openvpf/admin/verifications", label: "admin.nav.verifications", icon: "pi pi-id-card" },
      { to: "/openvpf/admin/violations", label: "admin.nav.violations", icon: "pi pi-exclamation-triangle" },
    ],
  },
  {
    label: "admin.nav.money",
    items: [
      { to: "/openvpf/admin/purchases", label: "admin.nav.purchases", icon: "pi pi-wallet" },
      { to: "/openvpf/admin/vouchers", label: "admin.nav.vouchers", icon: "pi pi-ticket" },
    ],
  },
] as const

const mobileNavOpen = ref(false)
</script>

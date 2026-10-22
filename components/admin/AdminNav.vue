<template>
  <nav :aria-label="$t('admin.nav.sections')" class="py-2">
    <div v-for="group in groups" :key="group.label" class="mb-4">
      <p class="px-4 py-1 font-display text-[0.8125rem] font-bold tracking-[0.08em] text-muted-color uppercase">
        {{ $t(group.label) }}
      </p>
      <ul>
        <li v-for="item in group.items" :key="item.to">
          <NuxtLinkLocale
            :to="item.to"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            class="flex min-h-11 items-center gap-2.5 px-4 text-sm font-medium text-color no-underline hover:bg-surface-100 aria-[current]:bg-surface-100 aria-[current]:font-semibold aria-[current]:shadow-accent-left"
            @click="emit('navigate')"
          >
            <AppIcon :name="item.icon" class="size-4 text-muted-color" />
            {{ $t(item.label) }}
          </NuxtLinkLocale>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
/** The admin console's sections: Meets · Athletes · Money. */
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()

const groups = [
  {
    label: "admin.nav.meets",
    items: [
      { to: "/admin", label: "admin.nav.dashboard", icon: "lucide:inbox" },
      { to: "/admin/meets", label: "admin.nav.meetList", icon: "lucide:calendar" },
    ],
  },
  {
    label: "admin.nav.athletes",
    items: [
      { to: "/admin/athletes", label: "admin.nav.athleteList", icon: "lucide:users" },
      { to: "/admin/verifications", label: "admin.nav.verifications", icon: "lucide:id-card" },
      { to: "/admin/violations", label: "admin.nav.violations", icon: "lucide:triangle-alert" },
    ],
  },
  {
    label: "admin.nav.money",
    items: [
      { to: "/admin/purchases", label: "admin.nav.purchases", icon: "lucide:wallet" },
      { to: "/admin/vouchers", label: "admin.nav.vouchers", icon: "lucide:ticket" },
    ],
  },
] as const

function isActive(to: string) {
  const path = route.path.replace(/^\/vi(?=\/|$)/, "")
  return to === "/admin" ? path === to : path === to || path.startsWith(`${to}/`)
}
</script>

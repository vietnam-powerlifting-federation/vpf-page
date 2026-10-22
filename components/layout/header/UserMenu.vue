<template>
  <div>
    <button
      type="button"
      class="inline-flex min-h-11 max-w-56 cursor-pointer items-center gap-2 rounded px-2 text-board-ink transition-colors duration-120 ease-snap hover:bg-board-2"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="user-menu"
      :aria-label="$t('nav.openUserMenu')"
      @click="menu?.toggle($event)"
    >
      <img v-if="avatarUrl" :src="avatarUrl" alt="" width="32" height="32" class="size-8 rounded object-cover">
      <span v-else class="grid size-8 place-items-center rounded bg-board-2 ring-1 ring-board-line">
        <AppIcon name="lucide:user" class="size-4" />
      </span>
      <span class="hidden truncate text-sm font-semibold wm:inline">{{ name }}</span>
      <AppIcon name="lucide:chevron-down" class="size-4 text-board-ink-2" />
    </button>
    <Menu id="user-menu" ref="menu" :model="items" popup @show="open = true" @hide="open = false">
      <template #start>
        <p class="truncate border-b border-surface-200 px-3 py-2 text-sm font-semibold">{{ name }}</p>
      </template>
      <template #item="{ item, props }">
        <NuxtLinkLocale v-if="item.to" :to="item.to" v-bind="props.action" class="flex min-h-11 items-center gap-2.5 px-3 no-underline">
          <AppIcon :name="item.icon" class="size-4 text-muted-color" />
          <span>{{ item.label }}</span>
        </NuxtLinkLocale>
        <a v-else v-bind="props.action" class="flex min-h-11 cursor-pointer items-center gap-2.5 px-3">
          <AppIcon :name="item.icon" class="size-4 text-muted-color" />
          <span>{{ item.label }}</span>
        </a>
      </template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import type Menu from "primevue/menu"

const { t } = useI18n()
const localePath = useLocalePath()
const { athlete, isAdmin } = useAuthSession()

const menu = ref<InstanceType<typeof Menu> | null>(null)
const open = ref(false)

const name = computed(() => athlete.value?.athlete?.fullName ?? "")
const avatarUrl = computed(() => athlete.value?.vipSettings?.avatarImageUrl ?? null)

const items = computed(() => [
  { label: t("nav.viewProfile"), icon: "lucide:user", to: "/athletes/me" },
  { label: t("nav.profileSettings"), icon: "lucide:settings", to: "/profile" },
  ...(isAdmin.value ? [{ label: t("nav.admin"), icon: "lucide:shield", to: "/admin" }] : []),
  { separator: true },
  { label: t("nav.signOut"), icon: "lucide:log-out", command: signOut },
])

async function signOut() {
  await $fetch("/api/auth/logout", { method: "POST" })
  athlete.value = null
  await navigateTo(localePath("/login"))
}
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="close(true)">
    <button
      ref="trigger"
      type="button"
      class="inline-flex min-h-11 max-w-56 cursor-pointer items-center gap-2 rounded px-2 text-board-ink transition-colors duration-120 ease-snap hover:bg-board-2"
      :aria-expanded="open"
      :aria-controls="menuId"
      :aria-label="$t('nav.openUserMenu')"
      @click="open = !open"
    >
      <img v-if="avatarUrl" :src="avatarUrl" alt="" width="32" height="32" class="size-8 rounded object-cover">
      <span v-else class="grid size-8 place-items-center rounded bg-board-2 ring-1 ring-board-line">
        <AppIcon name="lucide:user" class="size-4" />
      </span>
      <span class="hidden truncate text-sm font-semibold wm:inline">{{ name }}</span>
      <AppIcon name="lucide:chevron-down" class="size-4 text-board-ink-2 transition-transform duration-120 ease-snap" :class="open && 'rotate-180'" />
    </button>

    <!-- A disclosure of links rather than an ARIA menu: Tab moves through it and Escape closes it. -->
    <div
      v-show="open"
      :id="menuId"
      class="absolute top-full right-0 z-50 mt-2 w-60 rounded-md border border-surface-200 bg-surface-0 py-1 text-color shadow-lg"
    >
      <p class="truncate border-b border-surface-200 px-3 py-2 text-sm font-semibold">{{ name }}</p>
      <ul>
        <li v-for="item in links" :key="item.to">
          <NuxtLinkLocale :to="item.to" class="flex min-h-11 items-center gap-2.5 px-3 text-sm no-underline hover:bg-surface-100" @click="close()">
            <AppIcon :name="item.icon" class="size-4 text-muted-color" />
            {{ item.label }}
          </NuxtLinkLocale>
        </li>
        <li class="mt-1 border-t border-surface-200 pt-1">
          <button type="button" class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 text-left text-sm hover:bg-surface-100" @click="signOut">
            <AppIcon name="lucide:log-out" class="size-4 text-muted-color" />
            {{ $t("nav.signOut") }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { athlete, isAdmin } = useAuthSession()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menuId = useId()

const name = computed(() => athlete.value?.athlete?.fullName ?? "")
const avatarUrl = computed(() => athlete.value?.vipSettings?.avatarImageUrl ?? null)

const links = computed(() => [
  { label: t("nav.viewProfile"), icon: "lucide:user", to: "/athletes/me" },
  { label: t("nav.profileSettings"), icon: "lucide:settings", to: "/profile" },
  ...(isAdmin.value ? [{ label: t("nav.admin"), icon: "lucide:shield", to: "/admin" }] : []),
])

function close(returnFocus = false) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

// Close on a click or focus outside the menu.
function onOutside(event: Event) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}
onMounted(() => {
  document.addEventListener("click", onOutside, true)
  document.addEventListener("focusin", onOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener("click", onOutside, true)
  document.removeEventListener("focusin", onOutside)
})

async function signOut() {
  close()
  await $fetch("/api/auth/logout", { method: "POST" })
  athlete.value = null
  await navigateTo(localePath("/login"))
}
</script>

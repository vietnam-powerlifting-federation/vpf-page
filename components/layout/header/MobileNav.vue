<template>
  <SideDrawer v-model:visible="visible" :title="$t('nav.menu')" :close-label="$t('nav.closeMenu')" body-class="flex flex-col" @closed="emit('closed')">
    <nav :aria-label="$t('nav.main')">
      <ul class="grid gap-1 p-3">
        <li v-for="item in items" :key="item.to">
          <NuxtLinkLocale
            :to="item.to"
            :aria-current="ariaCurrent(item.to)"
            class="flex min-h-12 items-center rounded px-4 font-display text-lg font-bold tracking-[0.06em] uppercase no-underline hover:bg-surface-100 aria-[current]:bg-surface-100 aria-[current]:shadow-accent-left"
            @click="visible = false"
          >
            {{ $t(item.label) }}
          </NuxtLinkLocale>
        </li>
      </ul>
    </nav>

    <div class="mt-auto grid gap-3 border-t border-surface-200 p-4">
      <div class="flex items-center justify-between gap-3 text-sm text-muted-color">
        <span>{{ $t("site.language") }}</span>
        <LangSwitch />
      </div>
      <div class="flex items-center justify-between gap-3 text-sm text-muted-color">
        <span>{{ $t("site.appearance") }}</span>
        <ThemeToggle with-text />
      </div>
    </div>
  </SideDrawer>
</template>

<script setup lang="ts">
/** The header nav, language and theme controls below 900px, in a right-hand drawer. */
const visible = defineModel<boolean>("visible", { required: true })
const emit = defineEmits<{ closed: [] }>()

const { items, ariaCurrent } = useMainNav()

// Close the drawer if the window grows past the point where the header shows the nav.
onMounted(() => {
  const wide = window.matchMedia("(min-width: 900px)")
  const onChange = (e: MediaQueryListEvent) => { if (e.matches) visible.value = false }
  wide.addEventListener("change", onChange)
  onBeforeUnmount(() => wide.removeEventListener("change", onChange))
})
</script>

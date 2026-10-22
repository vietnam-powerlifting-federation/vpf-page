<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :block-scroll="true"
    class="!w-[min(320px,86vw)]"
    :pt="{ header: { class: 'border-b border-surface-200 !py-3' }, content: { class: '!p-0 flex flex-col' } }"
    @hide="emit('closed')"
  >
    <template #header>
      <strong class="font-display text-lg font-bold tracking-[0.06em] uppercase">{{ $t("nav.menu") }}</strong>
    </template>
    <template #closebutton="{ closeCallback }">
      <button
        type="button"
        autofocus
        class="grid size-11 cursor-pointer place-items-center rounded hover:bg-surface-100"
        :aria-label="$t('nav.closeMenu')"
        @click="closeCallback"
      >
        <AppIcon name="lucide:x" class="size-5" />
      </button>
    </template>

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
  </Drawer>
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

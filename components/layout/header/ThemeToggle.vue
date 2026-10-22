<template>
  <button
    type="button"
    :aria-label="label"
    class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded transition-colors duration-120 ease-snap"
    :class="withText
      ? 'border border-surface-300 bg-surface-0 px-4 text-sm font-semibold hover:bg-surface-100'
      : 'w-11 text-board-ink hover:bg-board-2'"
    @click="toggle"
  >
    <!-- Both icons render on the server; the .dark class picks one, so there is no flash. -->
    <AppIcon name="lucide:moon" class="size-5 dark:hidden" />
    <AppIcon name="lucide:sun" class="hidden size-5 dark:block" />
    <span v-if="withText" aria-hidden="true">
      <span class="dark:hidden">{{ $t("site.dark") }}</span>
      <span class="hidden dark:inline">{{ $t("site.light") }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
/** Light/dark switch. Starts from the device theme; a choice is remembered by @nuxtjs/color-mode. */
defineProps<{ withText?: boolean }>()

const { t } = useI18n()
const colorMode = useColorMode()

// The server cannot know the device theme, so the label is settled after hydration.
const mounted = ref(false)
onMounted(() => { mounted.value = true })

const isDark = computed(() => mounted.value && colorMode.value === "dark")
const label = computed(() => (isDark.value ? t("site.toLight") : t("site.toDark")))

function toggle() {
  colorMode.preference = isDark.value ? "light" : "dark"
}
</script>

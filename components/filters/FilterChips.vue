<template>
  <template v-if="chips.length">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded border border-transparent bg-accent-soft py-0 pr-1 pl-3 text-[0.8125rem] font-medium whitespace-nowrap text-color hover:border-accent"
      :aria-label="`${$t('filters.remove')}: ${chip.label}`"
      @click="emit('remove', chip.key)"
    >
      {{ chip.label }}
      <AppIcon name="lucide:x" class="size-4" />
    </button>
    <button
      type="button"
      class="min-h-8 cursor-pointer px-1 text-sm font-medium text-accent underline underline-offset-3"
      @click="emit('reset')"
    >
      {{ $t("filters.reset") }}
    </button>
  </template>
</template>

<script setup lang="ts">
/** Active filters as removable chips, followed by "Reset filters". */
defineProps<{ chips: { key: string; label: string }[] }>()
const emit = defineEmits<{ remove: [key: string]; reset: [] }>()
</script>

<template>
  <nav :aria-label="$t('tables.pages')" class="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 px-4 py-3 text-sm">
    <div class="flex items-center gap-2">
      <label :id="sizeLabelId" class="text-muted-color">{{ $t("tables.perPage") }}</label>
      <Select
        :model-value="pageSize"
        :options="sizes"
        :aria-labelledby="sizeLabelId"
        size="small"
        @update:model-value="emit('update:pageSize', $event)"
      />
    </div>
    <div class="flex items-center gap-2">
      <span class="whitespace-nowrap text-muted-color tabular-nums">
        {{ $t("tables.status", { from: total ? from : 0, to, total }) }}
      </span>
      <button
        type="button"
        class="grid size-11 cursor-pointer place-items-center rounded border border-surface-300 bg-surface-0 transition-colors duration-120 ease-snap enabled:hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="page <= 1"
        :aria-label="$t('tables.prev')"
        @click="emit('update:page', page - 1)"
      >
        <AppIcon name="lucide:chevron-left" class="size-5" />
      </button>
      <button
        type="button"
        class="grid size-11 cursor-pointer place-items-center rounded border border-surface-300 bg-surface-0 transition-colors duration-120 ease-snap enabled:hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="page >= pages"
        :aria-label="$t('tables.next')"
        @click="emit('update:page', page + 1)"
      >
        <AppIcon name="lucide:chevron-right" class="size-5" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
/** Rows per page (25/50/100), "1–25 of 40", and previous/next. */
const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ "update:page": [page: number]; "update:pageSize": [size: number] }>()

const sizes = [25, 50, 100]
const sizeLabelId = useId()

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <div>
    <p v-if="overflows" class="flex items-center gap-1.5 border-b border-surface-200 px-4 py-2 text-[0.8125rem] text-muted-color">
      <AppIcon name="lucide:move-horizontal" class="size-4" />
      {{ $t("tables.scrollHint") }}
    </p>
    <!-- Focusable only while it overflows, so keyboard users can scroll it. -->
    <div
      ref="scroller"
      role="region"
      :aria-labelledby="captionId"
      :tabindex="overflows ? 0 : undefined"
      :data-scrolled="scrolled || undefined"
      class="relative overflow-x-auto overscroll-x-contain focus-visible:-outline-offset-2"
      @scroll.passive="onScroll"
    >
      <table class="w-full border-separate border-spacing-0 tabular-nums transition-opacity duration-200 aria-busy:opacity-60" :aria-busy="busy || undefined">
        <caption :id="captionId" class="sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :aria-sort="col.sortable && sortKey === col.key ? 'descending' : undefined"
              class="bg-board p-3 align-middle font-display text-sm font-bold tracking-[0.08em] whitespace-nowrap text-board-ink-2 uppercase"
              :class="[pinClass(col), col.numeric ? 'text-right' : 'text-left']"
            >
              <button
                v-if="col.sortable"
                type="button"
                class="group/sort inline-flex min-h-8 cursor-pointer items-center gap-1 whitespace-nowrap uppercase hover:text-board-ink"
                :class="sortKey === col.key && 'text-accent-fill hover:text-accent-fill'"
                @click="emit('sort', col.key)"
              >
                {{ col.label }}
                <AppIcon
                  name="lucide:arrow-down"
                  class="size-3.5"
                  :class="sortKey === col.key ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'"
                />
              </button>
              <template v-else-if="col.srLabel">
                <span aria-hidden="true">{{ col.label }}</span>
                <span class="sr-only">{{ col.srLabel }}</span>
              </template>
              <template v-else>{{ col.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody v-for="section in sections" :key="section.key">
          <tr v-if="section.label">
            <th
              :colspan="columns.length"
              scope="rowgroup"
              class="border-b border-surface-200 bg-surface-100 px-3 py-2 text-left font-display text-base font-bold tracking-[0.06em] uppercase"
            >
              <span class="sticky left-3">{{ section.label }}</span>
            </th>
          </tr>
          <tr v-for="(row, index) in section.rows" :key="rowKey(row, index)" class="group">
            <component
              :is="col.rowHeader ? 'th' : 'td'"
              v-for="col in columns"
              :key="col.key"
              :scope="col.rowHeader ? 'row' : undefined"
              class="border-b border-surface-200 p-3 align-middle text-[0.9375rem] whitespace-nowrap group-last:border-b-0"
              :class="[
                pinClass(col),
                col.numeric ? 'text-right font-display text-lg font-semibold' : 'text-left font-normal',
                col.sortable && sortKey === col.key
                  ? 'bg-sorted !font-bold group-hover:bg-accent-soft'
                  : 'bg-surface-0 group-hover:bg-surface-100',
              ]"
            >
              <slot :name="`cell-${col.key}`" :row="row" :index="index">
                {{ row[col.key] }}
              </slot>
            </component>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import type { TableColumn } from "~/types/tables"

/**
 * The public results table: a native <table> at every width. On narrow
 * screens it scrolls sideways inside its panel while the rank and athlete
 * columns stay pinned. Cells are filled through `#cell-<key>` slots.
 */
const props = defineProps<{
  columns: TableColumn[]
  rows?: T[]
  /** Rows split into labelled row groups (one <tbody> each), e.g. by weight class. Used instead of `rows`. */
  groups?: { key: string; label: string; rows: T[] }[]
  /** Describes the content and current sort for screen readers. */
  caption: string
  sortKey?: string
  rowKey: (row: T, index: number) => string | number
  /** Set while new rows are loading; old rows stay visible. */
  busy?: boolean
}>()

const emit = defineEmits<{ sort: [key: string] }>()

const sections = computed(() => props.groups ?? [{ key: "all", label: "", rows: props.rows ?? [] }])

const captionId = useId()
const scroller = ref<HTMLElement | null>(null)
const overflows = ref(false)
const scrolled = ref(false)

function pinClass(col: TableColumn) {
  if (col.pin === "rank") return "sticky left-0 z-[1] w-[var(--col-rank)] min-w-[var(--col-rank)] !px-2 !text-center"
  if (col.pin === "lead") return "sticky left-0 z-[1] min-w-[6rem] in-data-scrolled:shadow-pin"
  if (col.pin === "name") return "sticky left-[var(--col-rank)] z-[1] min-w-[10.5rem] !whitespace-normal in-data-scrolled:shadow-pin"
  return ""
}

function measure() {
  const el = scroller.value
  if (!el) return
  overflows.value = el.scrollWidth > el.clientWidth + 1
  scrolled.value = el.scrollLeft > 0
}

function onScroll() {
  scrolled.value = (scroller.value?.scrollLeft ?? 0) > 0
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (scroller.value) {
    observer.observe(scroller.value)
    const table = scroller.value.querySelector("table")
    if (table) observer.observe(table)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.rows, props.groups, props.columns], () => nextTick(measure))
</script>

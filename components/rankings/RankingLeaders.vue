<template>
  <section v-if="leaders.length" :aria-labelledby="titleId">
    <h2 :id="titleId" class="mb-3 font-display text-[0.9375rem] font-bold tracking-[0.12em] text-board-ink-2 uppercase">
      {{ $t("ranking.leaders") }}
    </h2>
    <ol class="grid gap-3 sm:grid-cols-3">
      <li
        v-for="row in leaders"
        :key="row.vpfId"
        class="relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-md border border-board-line bg-board-2 px-4 py-3 text-board-ink transition-colors duration-120 ease-snap focus-within:border-board-ink-2 hover:border-board-ink-2 sm:grid-cols-1 sm:items-start sm:p-4"
        :class="row.rank === 1 && 'shadow-accent-top'"
      >
        <span
          class="row-span-2 min-w-[1.2ch] text-center font-display text-[2.25rem] leading-[0.9] font-extrabold sm:row-span-1 sm:text-left sm:text-[3.25rem]"
          :class="row.rank === 1 ? 'text-accent-fill' : 'text-board-ink-2'"
        >
          <span class="sr-only">{{ $t("tables.rank") }}&nbsp;</span>{{ row.rank }}
        </span>
        <NuxtLinkLocale
          :to="athletePath(row)"
          class="col-start-2 font-semibold no-underline [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-md hover:underline hover:underline-offset-3 sm:col-start-1"
        >
          <span :style="nameDecoratorStyle(decorators.get(row.vpfId)?.decorator1, decorators.get(row.vpfId)?.decorator2, 'board')">{{ row.name }}</span>
        </NuxtLinkLocale>
        <span class="col-start-2 text-[0.8125rem] text-board-ink-2 sm:col-start-1">{{ meta(row) }}</span>
        <span class="col-start-3 row-span-2 row-start-1 font-display text-[1.625rem] leading-[1.2] font-bold tracking-[0.01em] tabular-nums sm:col-start-1 sm:row-span-1 sm:row-start-auto sm:mt-1 sm:text-[2rem]">
          {{ score(row) }}<small class="ml-1 font-sans text-[0.8125rem] font-semibold text-accent-fill">{{ unit }}</small>
        </span>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { formatGl, formatKg, nameDecoratorStyle } from "~/lib/domain/format"
import type { RankingRow } from "~/types/results"

/** "Leading the table": the top three of the current filter set, as cards on the board. */
const props = defineProps<{
  rows: RankingRow[]
  sort: "gl" | "total" | "bestSquat" | "bestBench" | "bestDeadlift"
  meta: (row: RankingRow) => string
  decorators: Map<string, { decorator1: string | null; decorator2: string | null }>
}>()

const { locale } = useI18n()
const titleId = useId()

const leaders = computed(() => props.rows.slice(0, 3))
const unit = computed(() => (props.sort === "gl" ? "GL" : "kg"))

function score(row: RankingRow) {
  return props.sort === "gl" ? formatGl(row.gl, locale.value) : formatKg(row[props.sort], locale.value)
}

function athletePath(row: RankingRow) {
  return `/athletes/${row.slug || row.vpfId}`
}
</script>

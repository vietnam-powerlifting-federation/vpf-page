<template>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3 text-sm">
      <span role="status" aria-live="polite" class="mr-1 font-display text-lg font-bold tracking-[0.04em] uppercase">
        {{ loaded ? $t("ranking.count", total) : $t("tables.loading") }}
      </span>
      <FilterChips :chips="chips" @remove="emit('removeChip', $event)" @reset="emit('reset')" />
    </div>

    <div ref="panel" tabindex="-1" class="scroll-mt-20 overflow-clip rounded-md border border-surface-200 bg-surface-0 focus:outline-none">
      <TableSkeleton v-if="!loaded" :columns="5" />
      <template v-else-if="total">
        <ResultsTable
          :columns="columns"
          :rows="rows"
          :caption="$t('ranking.caption', { sort: t(SORT_LABEL_KEYS[sortName]) })"
          :sort-key="sortName"
          :row-key="(row) => row.vpfId"
          :busy="busy"
          @sort="emit('sort', $event)"
        >
          <template #cell-rank="{ row }">
            <RankCell :rank="row.rank" />
          </template>
          <template #cell-athlete="{ row }">
            <AthleteCell
              :name="row.name"
              :to="`/athletes/${row.slug || row.vpfId}`"
              :meta="athleteMeta(row, t)"
              :decorator1="decoratorMap.get(row.vpfId)?.decorator1"
              :decorator2="decoratorMap.get(row.vpfId)?.decorator2"
            />
          </template>
          <template #cell-gl="{ row }">
            <GlCell :value="row.gl" />
          </template>
          <template #cell-total="{ row }">
            <LiftCell :value="row.total" />
          </template>
          <template #cell-squat="{ row }">
            <LiftCell :value="row.bestSquat" />
          </template>
          <template #cell-bench="{ row }">
            <LiftCell :value="row.bestBench" />
          </template>
          <template #cell-deadlift="{ row }">
            <LiftCell :value="row.bestDeadlift" />
          </template>
        </ResultsTable>
        <TablePager
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="goToPage"
          @update:page-size="emit('pageSize', $event)"
        />
      </template>
      <TableEmpty v-else :title="$t('ranking.emptyTitle')" :body="$t('ranking.emptyBody')">
        <AppButton variant="secondary" @click="emit('reset')">{{ $t("filters.reset") }}</AppButton>
      </TableEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { athleteMeta } from "~/lib/domain/format"
import { SORT_LABEL_KEYS, type SortName } from "~/lib/domain/rankings"
import type { TableColumn } from "~/types/tables"
import type { RankingRow } from "~/types/results"

/** The rankings table with its result count, filter chips, pager, loading and empty states. */
defineProps<{
  rows: RankingRow[]
  /** Rows across all pages, after search. */
  total: number
  loaded: boolean
  busy: boolean
  page: number
  pageSize: number
  sortName: SortName
  chips: { key: string; label: string }[]
}>()
const emit = defineEmits<{
  sort: [key: string]
  page: [page: number]
  pageSize: [size: number]
  removeChip: [key: string]
  reset: []
}>()

const { t } = useI18n()
const { decoratorMap } = useNameDecorators()

const panel = ref<HTMLElement | null>(null)
function goToPage(next: number) {
  emit("page", next)
  panel.value?.focus({ preventScroll: true })
  panel.value?.scrollIntoView({ block: "start" })
}

const columns = computed<TableColumn[]>(() => [
  { key: "rank", label: "#", srLabel: t("tables.rank"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  { key: "gl", label: t(SORT_LABEL_KEYS.gl), numeric: true, sortable: true },
  ...(["total", "squat", "bench", "deadlift"] as const).map((key) => ({
    key,
    label: t("ranking.withUnit", { label: t(SORT_LABEL_KEYS[key]) }),
    numeric: true,
    sortable: true,
  })),
])
</script>

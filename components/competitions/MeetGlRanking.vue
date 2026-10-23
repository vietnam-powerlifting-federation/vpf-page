<template>
  <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
    <ResultsTable
      :columns="columns"
      :rows="pageRows"
      :caption="$t('meets.glCaption')"
      sort-key="gl"
      :row-key="(row) => row.resultId"
    >
      <template #cell-rank="{ row }">
        <RankCell :rank="row.rank" />
      </template>
      <template #cell-athlete="{ row }">
        <AthleteCell v-bind="athleteProps(row)" :meta="athleteMeta(row, t)" />
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
    <TablePager v-model:page="page" v-model:page-size="pageSize" :total="ranked.length" />
  </div>
</template>

<script setup lang="ts">
import { athleteMeta } from "~/lib/domain/format"
import { athleteProps, glRanking } from "~/lib/domain/meet-rows"
import type { MeetRow } from "~/types/meets"
import type { TableColumn } from "~/types/tables"

/** Everyone at the competition ranked by GL points across categories, 25 to a page. */
const props = defineProps<{ rows: MeetRow[] }>()

const { t } = useI18n()

const ranked = computed(() => glRanking(props.rows))

const page = ref(1)
const pageSize = ref(25)
watch(pageSize, () => { page.value = 1 })
const pageRows = computed(() => ranked.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const columns = computed<TableColumn[]>(() => [
  { key: "rank", label: "#", srLabel: t("tables.rank"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  { key: "gl", label: t("ranking.glPoints"), numeric: true, sortable: true },
  ...(["total", "squat", "bench", "deadlift"] as const).map((key) => ({
    key,
    label: t("ranking.withUnit", { label: t(`general.${key}`) }),
    numeric: true,
  })),
])
</script>

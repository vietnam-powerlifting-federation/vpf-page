<template>
  <section :aria-labelledby="titleId" class="grid gap-3">
    <h2 :id="titleId" class="font-display text-2xl font-bold uppercase">{{ $t("athlete.competitionHistory") }}</h2>
    <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
      <TableEmpty v-if="rows.length === 0" :title="$t('athlete.noHistory')" />
      <ResultsTable v-else :columns="columns" :rows="rows" :caption="$t('athlete.historyCaption', { name })" :row-key="(row) => row.resultId ?? row.legacyResultId">
        <template #cell-date="{ row }">
          <span class="font-display text-base font-semibold text-muted-color tabular-nums">{{ formatDate(row.meet?.hostDate, locale) }}</span>
        </template>
        <template #cell-competition="{ row }">
          <span class="block min-w-48 whitespace-normal">
            <NuxtLinkLocale v-if="row.meet" :to="`/competitions/${row.meet.meetSlug}`" class="font-semibold decoration-accent decoration-2 underline-offset-3 hover:underline">
              {{ row.meet.meetName }}
            </NuxtLinkLocale>
            <span v-else>–</span>
            <span class="block text-[0.8125rem] whitespace-nowrap text-muted-color">
              {{ formatWeightClass(row.weightClass, row.sex) }} · {{ $t(DIVISION_LABEL_KEY[row.division]) }}
            </span>
          </span>
        </template>
        <template #cell-place="{ row }">
          <RankCell v-bind="row.placement === DISQUALIFIED ? { rank: null, label: $t('meets.dsq'), labelTitle: $t('meets.dsqTitle') } : { rank: row.placement }" />
        </template>
        <template #cell-squat="{ row }">
          <LiftCell :value="bestLift(row, 'squat')" />
        </template>
        <template #cell-bench="{ row }">
          <LiftCell :value="bestLift(row, 'bench')" />
        </template>
        <template #cell-deadlift="{ row }">
          <LiftCell :value="bestLift(row, 'deadlift')" />
        </template>
        <template #cell-total="{ row }">
          <LiftCell :value="row.total" />
        </template>
        <template #cell-gl="{ row }">
          <GlCell :value="row.gl" />
        </template>
        <template #cell-bodyWeight="{ row }">
          <LiftCell :value="row.bodyWeight" />
        </template>
      </ResultsTable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DISQUALIFIED } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, formatDate, formatWeightClass } from "~/lib/domain/format"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { TableColumn } from "~/types/tables"

/** Every competition the athlete took part in, newest first. */
const props = defineProps<{ compHistory: Result[]; meets: MeetPublic[]; name: string }>()

const { t, locale } = useI18n()
const titleId = useId()

const rows = computed(() => {
  const meetsById = new Map(props.meets.map((m) => [m.meetId, m]))
  return props.compHistory
    .map((result) => ({ ...result, meet: meetsById.get(result.meetId) }))
    .sort((a, b) => (b.meet?.hostDate ?? "").localeCompare(a.meet?.hostDate ?? ""))
})

/** Legacy results store only attempts for some lifts; fall back to the best good attempt. */
function bestLift(result: Result, lift: "squat" | "bench" | "deadlift"): number | null {
  const best = lift === "squat" ? result.bestSquat : lift === "bench" ? result.bestBench : result.bestDeadlift
  if (best !== null && best !== undefined) return best
  const attempts = [result[`${lift}1`], result[`${lift}2`], result[`${lift}3`]].filter((v): v is number => typeof v === "number" && v > 0)
  return attempts.length ? Math.max(...attempts) : null
}

const columns = computed<TableColumn[]>(() => [
  { key: "date", label: t("general.date") },
  { key: "competition", label: t("athlete.competition"), rowHeader: true },
  { key: "place", label: t("general.place") },
  { key: "squat", label: t("ranking.withUnit", { label: t("general.squat") }), numeric: true },
  { key: "bench", label: t("ranking.withUnit", { label: t("general.bench") }), numeric: true },
  { key: "deadlift", label: t("ranking.withUnit", { label: t("general.deadlift") }), numeric: true },
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
  { key: "gl", label: t("ranking.glPoints"), numeric: true },
  { key: "bodyWeight", label: t("ranking.withUnit", { label: t("general.bodyWeight") }), numeric: true },
])
</script>

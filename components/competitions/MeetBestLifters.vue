<template>
  <div class="grid gap-8">
    <div v-if="!groups.length" class="rounded-md border border-surface-200 bg-surface-0">
      <TableEmpty :title="$t('meets.noBestLifters')" />
    </div>
    <template v-else>
      <section v-for="group in groups" :key="group.sex" :aria-labelledby="`best-${group.sex}`" class="flex min-w-0 flex-col gap-3">
        <h2 :id="`best-${group.sex}`" data-sticky-title class="sticky top-[var(--header-h)] z-[5] flex h-12 items-center bg-paper font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
        <div class="min-w-0 overflow-clip rounded-md border border-surface-200 bg-surface-0">
          <ResultsTable :columns="columns" :rows="group.rows" :caption="group.label" :row-key="(row) => row.resultId">
            <template #cell-rank="{ row }">
              <RankCell :rank="row.rank" />
            </template>
            <template #cell-athlete="{ row }">
              <AthleteCell v-bind="athleteProps(row)" :meta="athleteMeta(row, t)" />
            </template>
            <template #cell-bodyWeight="{ row }">
              <LiftCell :value="row.bodyWeight" />
            </template>
            <template v-for="lift in LIFTS" :key="lift.key" #[`cell-${lift.key}`]="{ row }">
              <LiftCell :value="row[lift.best]" />
            </template>
            <template #cell-total="{ row }">
              <LiftCell :value="row.total" />
            </template>
            <template #cell-gl="{ row }">
              <GlCell :value="row.gl" />
            </template>
          </ResultsTable>
        </div>
      </section>
      <p class="text-sm text-muted-color">{{ $t(season >= 2026 ? "meets.bestLiftersRuleNoMinimum" : "meets.bestLiftersRule") }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SEX_LABEL_KEY, athleteMeta } from "~/lib/domain/format"
import { LIFTS, athleteProps, bestLifters } from "~/lib/domain/meet-rows"
import type { MeetRow } from "~/types/meets"
import type { TableColumn } from "~/types/tables"

/** The best lifters (toàn năng) of the competition: the top three by GL points in each category. */
const props = defineProps<{ rows: MeetRow[]; season: number }>()

const { t } = useI18n()

const groups = computed(() => {
  const best = bestLifters(props.rows, props.season)
  return (["male", "female"] as const)
    .map((sex) => ({ sex, label: t("meets.bestLiftersGroup", { sex: t(SEX_LABEL_KEY[sex]) }), rows: best[sex] }))
    .filter((group) => group.rows.length)
})

const columns = computed<TableColumn[]>(() => [
  { key: "rank", label: "#", srLabel: t("tables.rank"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  { key: "bodyWeight", label: t("ranking.withUnit", { label: t("general.bodyWeight") }), numeric: true },
  ...(["squat", "bench", "deadlift", "total"] as const).map((key) => ({
    key,
    label: t("ranking.withUnit", { label: t(`general.${key}`) }),
    numeric: true,
  })),
  { key: "gl", label: t("ranking.glPoints"), numeric: true },
])
</script>

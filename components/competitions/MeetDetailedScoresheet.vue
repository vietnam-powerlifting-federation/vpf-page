<template>
  <div class="grid gap-8">
    <section
      v-for="group in sections"
      :key="group.key"
      :aria-labelledby="`detail-${group.key}`"
      class="grid gap-3 [contain-intrinsic-size:auto_800px] [content-visibility:auto]"
    >
      <h2 :id="`detail-${group.key}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
      <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
        <ResultsTable
          :columns="columns"
          :groups="group.weightClasses"
          :caption="$t('meets.detailedCaption', { group: group.label })"
          :row-key="(row) => row.resultId"
        >
          <template #cell-place="{ row }">
            <RankCell v-bind="placeProps(row.placement, t)" />
          </template>
          <template #cell-athlete="{ row }">
            <AthleteCell v-bind="athleteProps(row)" :meta="bodyWeightLabel(row, t, locale)" />
          </template>
          <template v-for="col in ATTEMPT_COLUMNS" :key="col.key" #[`cell-${col.key}`]="{ row }">
            <AttemptCell :value="row[col.key]" :best="row[col.key] !== null && row[col.key] === row[col.best]" />
          </template>
          <template #cell-total="{ row }">
            <LiftCell :value="row.total" />
          </template>
        </ResultsTable>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ATTEMPT_COLUMNS, athleteProps, bodyWeightLabel, placeProps, type MeetSection } from "~/lib/domain/meet-rows"
import type { TableColumn } from "~/types/tables"

/** The detailed scoresheet: all nine attempts per athlete, one table per category and division. */
defineProps<{ sections: MeetSection[] }>()

const { t, locale } = useI18n()

const liftShort = { squat: "meets.sq", bench: "meets.bp", deadlift: "meets.dl" } as const

const columns = computed<TableColumn[]>(() => [
  { key: "place", label: "#", srLabel: t("general.place"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  ...ATTEMPT_COLUMNS.map((col) => ({
    key: col.key,
    label: `${t(liftShort[col.lift])}${col.n}`,
    srLabel: t("meets.attemptLabel", { lift: t(`general.${col.lift}`), n: col.n }),
    numeric: true,
  })),
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
])
</script>

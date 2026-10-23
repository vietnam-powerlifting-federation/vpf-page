<template>
  <div class="grid gap-8">
    <section
      v-for="group in sections"
      :key="group.key"
      :aria-labelledby="`sheet-${group.key}`"
      class="grid gap-3 [contain-intrinsic-size:auto_800px] [content-visibility:auto]"
    >
      <h2 :id="`sheet-${group.key}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
      <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
        <ResultsTable
          :columns="columns"
          :groups="group.weightClasses"
          :caption="$t('meets.scoresheetCaption', { group: group.label })"
          :row-key="(row) => row.resultId"
        >
          <template #cell-place="{ row }">
            <RankCell v-bind="placeProps(row.placement, t)" />
          </template>
          <template #cell-athlete="{ row }">
            <AthleteCell v-bind="athleteProps(row)" :meta="bodyWeightLabel(row, t, locale)" />
          </template>
          <template v-for="lift in LIFTS" :key="lift.key" #[`cell-${lift.key}`]="{ row }">
            <LiftCell :value="row[lift.best]" />
            <span v-if="row[lift.place] && row.placement !== DISQUALIFIED" class="block font-sans text-xs font-normal text-muted-color">
              {{ $t("meets.liftPlace", { n: row[lift.place] }) }}
            </span>
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
  </div>
</template>

<script setup lang="ts">
import { DISQUALIFIED } from "~/lib/constants/constants"
import { LIFTS, athleteProps, bodyWeightLabel, placeProps, type MeetSection } from "~/lib/domain/meet-rows"
import type { TableColumn } from "~/types/tables"

/** The scoresheet: best lifts, total and GL points, one table per category and division. */
defineProps<{ sections: MeetSection[] }>()

const { t, locale } = useI18n()

const columns = computed<TableColumn[]>(() => [
  { key: "place", label: "#", srLabel: t("general.place"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  ...LIFTS.map((lift) => ({ key: lift.key, label: t("ranking.withUnit", { label: t(`general.${lift.key}`) }), numeric: true })),
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
  { key: "gl", label: t("ranking.glPoints"), numeric: true },
])
</script>

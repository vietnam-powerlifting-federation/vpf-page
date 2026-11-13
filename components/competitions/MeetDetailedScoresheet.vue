<template>
  <div class="grid gap-8">
    <section
      v-for="group in sections"
      :key="group.key"
      :aria-labelledby="`detail-${group.key}`"
      class="flex min-w-0 flex-col gap-3 [contain-intrinsic-size:auto_800px] [content-visibility:auto]"
    >
      <h2 :id="`detail-${group.key}`" data-sticky-title class="sticky top-[var(--header-h)] z-[5] flex h-12 items-center bg-paper font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
      <div class="min-w-0 overflow-clip rounded-md border border-surface-200 bg-surface-0">
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
            <AttemptCell :value="row[col.key]" />
          </template>
          <template v-for="lift in LIFTS" :key="lift.place" #[`cell-${lift.place}`]="{ row }">
            <span v-if="row[lift.place] && row.placement !== DISQUALIFIED">{{ row[lift.place] }}</span>
            <span v-else class="text-muted-color" aria-hidden="true">–</span>
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
import { DISQUALIFIED } from "~/lib/constants/constants"
import { ATTEMPT_COLUMNS, LIFTS, athleteProps, bodyWeightLabel, placeProps, type MeetSection } from "~/lib/domain/meet-rows"
import type { TableColumn } from "~/types/tables"

/** The detailed scoresheet: all nine attempts per athlete, one table per category and division. */
defineProps<{ sections: MeetSection[] }>()

const { t, locale } = useI18n()

const liftShort = { squat: "meets.sq", bench: "meets.bp", deadlift: "meets.dl" } as const

const columns = computed<TableColumn[]>(() => [
  { key: "place", label: "#", srLabel: t("general.place"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  ...LIFTS.flatMap((lift) => [
    ...ATTEMPT_COLUMNS.filter((col) => col.lift === lift.key).map((col) => ({
      key: col.key,
      label: `${t(liftShort[col.lift])}${col.n}`,
      srLabel: t("meets.attemptLabel", { lift: t(`general.${col.lift}`), n: col.n }),
      numeric: true,
    })),
    {
      key: lift.place,
      label: `${t(liftShort[lift.key])} ${t("meets.pl")}`,
      srLabel: t(`meets.${lift.key}Place`),
      numeric: true,
    },
  ]),
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
])
</script>

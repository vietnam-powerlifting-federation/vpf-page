<template>
  <ResultsTable :columns="columns" :rows="rows" :caption="caption" :row-key="(row, i) => `${row.vpfId}-${row.weightClass}-${row.weight}-${i}`">
    <template #cell-weightClass="{ row }">
      <span class="font-display text-lg font-bold">{{ formatWeightClass(row.weightClass, row.sex) }}</span>
    </template>
    <template #cell-athlete="{ row }">
      <AthleteCell
        :name="row.name"
        :to="`/athletes/${row.slug || row.vpfId}`"
        :meta="row.bodyWeight ? $t('meets.bodyWeightValue', { kg: formatKg(row.bodyWeight, locale) }) : undefined"
        :decorator1="decorators.get(row.vpfId)?.decorator1"
        :decorator2="decorators.get(row.vpfId)?.decorator2"
      />
    </template>
    <template #cell-attempt="{ row }">
      {{ row.attempt }}
    </template>
    <template #cell-weight="{ row }">
      <span class="text-xl font-bold">{{ formatKg(row.weight, locale) }}</span>
    </template>
    <template #cell-improvement="{ row }">
      <span v-if="row.improvement !== null" class="text-success">+{{ formatKg(row.improvement, locale) }}</span>
      <span v-else class="text-muted-color">–</span>
      <span v-if="row.previous !== null" class="block font-sans text-[0.8125rem] font-normal text-muted-color">
        {{ $t("records.previousValue", { kg: formatKg(row.previous, locale) }) }}
      </span>
    </template>
  </ResultsTable>
</template>

<script setup lang="ts">
import { formatKg, formatWeightClass } from "~/lib/domain/format"
import type { RecordRow } from "~/types/records"
import type { TableColumn } from "~/types/tables"

/** The records broken in one lift at one championship, in order, with how much each one added. */
defineProps<{
  rows: (RecordRow & { improvement: number | null; previous: number | null })[]
  caption: string
  decorators: Map<string, { decorator1: string | null; decorator2: string | null }>
}>()

const { t, locale } = useI18n()

const columns = computed<TableColumn[]>(() => [
  { key: "weightClass", label: t("general.weightClass"), pin: "lead" },
  { key: "athlete", label: t("ranking.athlete"), rowHeader: true },
  { key: "attempt", label: t("records.attempt"), numeric: true },
  { key: "weight", label: t("ranking.withUnit", { label: t("athlete.record") }), numeric: true },
  { key: "improvement", label: t("records.improvement"), numeric: true },
])
</script>

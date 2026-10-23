<template>
  <ResultsTable :columns="columns" :rows="matrix" :caption="caption" :row-key="(row) => row.weightClass">
    <template #cell-weightClass="{ row }">
      <span class="font-display text-lg font-bold">{{ formatWeightClass(row.weightClass, sex) }}</span>
    </template>
    <template v-for="lift in LIFTS" :key="lift" #[`cell-${lift}`]="{ row }">
      <span v-if="row[lift]" class="grid min-w-36 justify-items-start gap-0.5">
        <button
          type="button"
          class="cursor-pointer rounded font-display text-xl leading-tight font-bold tabular-nums decoration-accent decoration-2 underline-offset-3 hover:underline"
          :aria-label="$t('records.openDetails', { lift: liftLabel(lift), weightClass: formatWeightClass(row.weightClass, sex) })"
          :aria-haspopup="'dialog'"
          @click="emit('open', row[lift])"
        >
          {{ formatKg(row[lift].weight, locale) }}<span class="ml-0.5 font-sans text-[0.8125rem] font-semibold text-muted-color">kg</span>
        </button>
        <AthleteCell
          :name="row[lift].name"
          :to="`/athletes/${row[lift].slug || row[lift].vpfId}`"
          :meta="formatDate(row[lift].hostDate, locale)"
          :decorator1="decorators.get(row[lift].vpfId)?.decorator1"
          :decorator2="decorators.get(row[lift].vpfId)?.decorator2"
          class="[&_a]:text-[0.9375rem]"
        />
      </span>
      <span v-else class="text-muted-color">
        <span aria-hidden="true">–</span>
        <span class="sr-only">{{ $t("records.noRecord") }}</span>
      </span>
    </template>
  </ResultsTable>
</template>

<script setup lang="ts">
import { formatDate, formatKg, formatWeightClass } from "~/lib/domain/format"
import type { RecordRow } from "~/types/records"
import type { TableColumn } from "~/types/tables"
import type { Sex } from "~/types/union-types"

/** Weight class × lift: the standing record in each cell, with its holder and date. */
const props = defineProps<{
  rows: RecordRow[]
  sex: Sex
  weightClasses: readonly number[]
  caption: string
  decorators: Map<string, { decorator1: string | null; decorator2: string | null }>
}>()
const emit = defineEmits<{ open: [row: RecordRow] }>()

const { t, locale } = useI18n()
const LIFTS = ["squat", "bench", "deadlift", "total"] as const
type Lift = typeof LIFTS[number]

function liftLabel(lift: Lift) {
  return t(lift === "bench" ? "general.benchPress" : `general.${lift}`)
}

const columns = computed<TableColumn[]>(() => [
  { key: "weightClass", label: t("general.weightClass"), pin: "lead", rowHeader: true },
  ...LIFTS.map((lift) => ({ key: lift, label: liftLabel(lift) })),
])

const matrix = computed(() => props.weightClasses.map((weightClass) => {
  const cells = {} as Record<Lift, RecordRow | undefined>
  for (const lift of LIFTS) {
    cells[lift] = props.rows.find((r) => r.lift === lift && r.weightClass === weightClass)
  }
  return { weightClass, ...cells }
}))
</script>

<template>
  <form
    :aria-label="$t('records.filterLabel')"
    class="grid min-w-0 gap-4 rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0 p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-[1fr_1fr_1fr_1.3fr]"
    @submit.prevent
  >
    <SegmentedControl
      :model-value="sex"
      :legend="$t('ranking.category')"
      :options="sexOptions"
      @update:model-value="emit('change', { sex: $event })"
    />
    <FilterSelect
      :model-value="division"
      :label="$t('general.division')"
      :hint="$t('filters.divisionHint')"
      :options="divisionOptions"
      @update:model-value="emit('change', { division: $event })"
    />
    <FilterSelect
      :model-value="year"
      :label="$t('general.season')"
      :options="yearOptions"
      :placeholder="$t('general.latest')"
      @update:model-value="emit('change', { year: $event })"
    />
    <SegmentedControl
      :model-value="mode"
      :legend="$t('records.view')"
      :options="modeOptions"
      @update:model-value="emit('change', { mode: $event })"
    />
  </form>
</template>

<script setup lang="ts">
import { RANKED_DIVISION, RECORD_START_YEAR } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY } from "~/lib/domain/format"
import type { Division } from "~/types/union-types"

/** The records filters: category, division, season and current-or-history view. */
defineProps<{ mode: string; sex: string; division: string; year: string }>()
const emit = defineEmits<{ change: [patch: { mode?: string; sex?: string; division?: string; year?: string }] }>()

const { t } = useI18n()

const sexOptions = computed(() => [
  { value: "male", label: t("general.men") },
  { value: "female", label: t("general.women") },
])

const divisionOptions = computed(() =>
  RANKED_DIVISION.map((d) => ({ value: d, label: t(DIVISION_LABEL_KEY[d as Division]) })))

const yearOptions = computed(() => {
  const years: { value: string; label: string }[] = [{ value: "", label: t("general.latest") }]
  for (let y = new Date().getFullYear(); y >= RECORD_START_YEAR; y--) years.push({ value: String(y), label: String(y) })
  return years
})

const modeOptions = computed(() => [
  { value: "current", label: t("records.currentRecords") },
  { value: "history", label: t("records.recordHistory") },
])
</script>

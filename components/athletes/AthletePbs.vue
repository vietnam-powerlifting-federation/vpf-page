<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.pbs") }}</h2>
    <DataTable :value="pbRow" show-gridlines>
      <Column :header="$t('athlete.squatPb')">
        <template #body="{ data }">
          <span class="text-primary font-medium">{{ data.squat !== null ? formatWeight(data.squat) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('athlete.benchPb')">
        <template #body="{ data }">
          <span class="text-primary font-medium">{{ data.bench !== null ? formatWeight(data.bench) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('athlete.deadliftPb')">
        <template #body="{ data }">
          <span class="text-primary font-medium">{{ data.deadlift !== null ? formatWeight(data.deadlift) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('athlete.totalPb')">
        <template #body="{ data }">
          {{ data.total !== null ? formatWeight(data.total) : "-" }}
        </template>
      </Column>
      <Column :header="$t('athlete.glPb')">
        <template #body="{ data }">
          {{ data.gl !== null ? formatGL(data.gl) : "-" }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import { formatWeight, formatGL } from "~/lib/utils/client"
import type { PersonalBestSummary, Result } from "~/types/results"

const props = defineProps<{
  personalBest: PersonalBestSummary
  compHistory: Result[]
}>()

const glPb = computed(() => {
  const values = props.compHistory.map((r) => r.gl).filter((v): v is number => v !== null && v !== undefined)
  return values.length > 0 ? Math.max(...values) : null
})

const pbRow = computed(() => [{
  squat: props.personalBest.squat,
  bench: props.personalBest.bench,
  deadlift: props.personalBest.deadlift,
  total: props.personalBest.total,
  gl: glPb.value,
}])
</script>

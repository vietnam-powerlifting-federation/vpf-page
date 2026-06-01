<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.competitionHistory") }}</h2>
    <DataTable :value="enrichedHistory" striped-rows show-gridlines>
      <template #empty>
        <div class="px-4 py-6 text-center text-surface-400">-</div>
      </template>
      <Column :header="$t('athlete.competition')">
        <template #body="{ data }">
          {{ data.meetName }}
        </template>
      </Column>
      <Column :header="$t('general.weightClass')">
        <template #body="{ data }">
          {{ formatWeightClass(data.result.weightClass, data.result.sex) }}
        </template>
      </Column>
      <Column :header="$t('general.division')">
        <template #body="{ data }">
          {{ formatDivision(data.result.division) }}
        </template>
      </Column>
      <Column :header="$t('athlete.bestSquat')" style="text-align: right">
        <template #body="{ data }">
          <span class="text-primary">{{ getBestLift(data.result, "squat") !== null ? formatWeight(getBestLift(data.result, "squat")) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('athlete.bestBench')" style="text-align: right">
        <template #body="{ data }">
          <span class="text-primary">{{ getBestLift(data.result, "bench") !== null ? formatWeight(getBestLift(data.result, "bench")) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('athlete.bestDeadlift')" style="text-align: right">
        <template #body="{ data }">
          <span class="text-primary">{{ getBestLift(data.result, "deadlift") !== null ? formatWeight(getBestLift(data.result, "deadlift")) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('general.total')" style="text-align: right">
        <template #body="{ data }">
          <span class="font-semibold text-primary">{{ data.result.total !== null && data.result.total !== undefined ? formatWeight(data.result.total) : "-" }}</span>
        </template>
      </Column>
      <Column :header="$t('general.gl')" style="text-align: right">
        <template #body="{ data }">
          {{ data.result.gl !== null && data.result.gl !== undefined ? formatGL(data.result.gl) : "-" }}
        </template>
      </Column>
      <Column :header="$t('general.bodyWeight')" style="text-align: right">
        <template #body="{ data }">
          {{ data.result.bodyWeight !== null && data.result.bodyWeight !== undefined ? formatWeight(data.result.bodyWeight) : "-" }}
        </template>
      </Column>
      <Column :header="$t('athlete.placement')" style="text-align: right">
        <template #body="{ data }">
          {{ data.result.placement ?? "-" }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import { formatWeightClass, formatDivision, formatWeight, formatGL } from "~/lib/utils/client"
import type { Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"

const props = defineProps<{
  compHistory: Result[]
  meets: MeetPublic[]
}>()

function getBestLift(result: Result, lift: "squat" | "bench" | "deadlift"): number | null {
  if (lift === "squat") {
    if (result.bestSquat !== null && result.bestSquat !== undefined) return result.bestSquat
    const attempts = [result.squat1, result.squat2, result.squat3].filter((v): v is number => v !== null && v !== undefined && v > 0)
    return attempts.length > 0 ? Math.max(...attempts) : null
  }
  if (lift === "bench") {
    if (result.bestBench !== null && result.bestBench !== undefined) return result.bestBench
    const attempts = [result.bench1, result.bench2, result.bench3].filter((v): v is number => v !== null && v !== undefined && v > 0)
    return attempts.length > 0 ? Math.max(...attempts) : null
  }
  if (result.bestDeadlift !== null && result.bestDeadlift !== undefined) return result.bestDeadlift
  const attempts = [result.deadlift1, result.deadlift2, result.deadlift3].filter((v): v is number => v !== null && v !== undefined && v > 0)
  return attempts.length > 0 ? Math.max(...attempts) : null
}

const enrichedHistory = computed(() => {
  const meetsById = new Map(props.meets.map((m) => [m.meetId, m]))
  return props.compHistory.map((result) => ({
    result,
    meetName: meetsById.get(result.meetId)?.meetName ?? "-",
  }))
})
</script>

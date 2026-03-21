<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.competitionHistory") }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse border border-surface-300 dark:border-surface-700">
        <thead>
          <tr class="bg-surface-100 dark:bg-surface-800">
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.competition") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("general.weightClass") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("general.division") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("athlete.bestSquat") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("athlete.bestBench") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("athlete.bestDeadlift") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("general.total") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("general.gl") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("general.bodyWeight") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("athlete.placement") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in enrichedHistory"
            :key="row.result.resultId ?? row.result.legacyResultId"
            class="hover:bg-surface-50 dark:hover:bg-surface-900"
          >
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ row.meetName }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ formatWeightClass(row.result.weightClass, row.result.sex) }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ formatDivision(row.result.division) }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right text-primary">
              {{ getBestLift(row.result, "squat") !== null ? formatWeight(getBestLift(row.result, "squat")) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right text-primary">
              {{ getBestLift(row.result, "bench") !== null ? formatWeight(getBestLift(row.result, "bench")) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right text-primary">
              {{ getBestLift(row.result, "deadlift") !== null ? formatWeight(getBestLift(row.result, "deadlift")) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold text-primary">
              {{ row.result.total !== null && row.result.total !== undefined ? formatWeight(row.result.total) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right">
              {{ row.result.gl !== null && row.result.gl !== undefined ? formatGL(row.result.gl) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right">
              {{ row.result.bodyWeight !== null && row.result.bodyWeight !== undefined ? formatWeight(row.result.bodyWeight) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right">
              {{ row.result.placement ?? "-" }}
            </td>
          </tr>
          <tr v-if="enrichedHistory.length === 0">
            <td colspan="10" class="border border-surface-300 dark:border-surface-700 px-4 py-6 text-center text-surface-400">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
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

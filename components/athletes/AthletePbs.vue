<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.pbs") }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse border border-surface-300 dark:border-surface-700">
        <thead>
          <tr class="bg-surface-100 dark:bg-surface-800">
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.squatPb") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.benchPb") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.deadliftPb") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.totalPb") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.glPb") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="hover:bg-surface-50 dark:hover:bg-surface-900">
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-primary font-medium">
              {{ personalBest.squat !== null ? formatWeight(personalBest.squat) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-primary font-medium">
              {{ personalBest.bench !== null ? formatWeight(personalBest.bench) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-primary font-medium">
              {{ personalBest.deadlift !== null ? formatWeight(personalBest.deadlift) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ personalBest.total !== null ? formatWeight(personalBest.total) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ glPb !== null ? formatGL(glPb) : "-" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
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
</script>

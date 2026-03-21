<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.liftersRecords") }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse border border-surface-300 dark:border-surface-700">
        <thead>
          <tr class="bg-surface-100 dark:bg-surface-800">
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.competition") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.record") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right font-semibold">{{ $t("general.total") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("general.weightClass") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("general.division") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("general.date") }}</th>
            <th class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.state") }}</th>
            <th v-if="showCertificate" class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-left font-semibold">{{ $t("athlete.recordCertificate") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in enrichedRecords"
            :key="`${row.record.resultId}-${row.record.lift}`"
            class="hover:bg-surface-50 dark:hover:bg-surface-900"
          >
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">{{ row.meetName }}</td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 font-medium text-primary">{{ liftLabel(row.record.lift) }}</td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2 text-right text-primary font-medium">{{ formatWeight(row.record.recordWeight) }}</td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              {{ row.result ? formatWeightClass(row.result.weightClass, row.result.sex) : "-" }}
            </td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">{{ formatDivision(row.record.recordDivision) }}</td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">{{ row.hostDate }}</td>
            <td class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              <span
                :class="row.record.status === 'holding' ? 'text-teal-400' : 'text-orange-400'"
                class="font-medium"
              >
                {{ row.record.status === "holding" ? $t("athlete.holding") : $t("athlete.broken") }}
              </span>
            </td>
            <td v-if="showCertificate" class="border border-surface-300 dark:border-surface-700 px-4 py-2">
              <button class="px-3 py-1 bg-primary text-primary-contrast rounded text-sm font-medium hover:opacity-90 transition-opacity">
                {{ $t("athlete.view") }}
              </button>
            </td>
          </tr>
          <tr v-if="enrichedRecords.length === 0">
            <td :colspan="showCertificate ? 8 : 7" class="border border-surface-300 dark:border-surface-700 px-4 py-6 text-center text-surface-400">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatWeightClass, formatDivision, formatWeight } from "~/lib/utils/client"
import type { LiftRecord } from "~/types/records"
import type { Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"

const props = defineProps<{
  records: LiftRecord[]
  compHistory: Result[]
  meets: MeetPublic[]
  showCertificate?: boolean
}>()

function liftLabel(lift: LiftRecord["lift"]): string {
  const map: Record<LiftRecord["lift"], string> = {
    squat: "Squat",
    bench: "Bench Press",
    deadlift: "Deadlift",
    total: "Total",
  }
  return map[lift]
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "-"
  try {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return date
  }
}

const enrichedRecords = computed(() => {
  const resultsById = new Map<string, Result>()
  for (const r of props.compHistory) {
    if (r.resultId) resultsById.set(r.resultId, r)
    if (r.legacyResultId) resultsById.set(r.legacyResultId, r)
  }
  const meetsById = new Map(props.meets.map((m) => [m.meetId, m]))

  return props.records.map((record) => {
    const result = resultsById.get(record.resultId)
    const meet = result ? meetsById.get(result.meetId) : undefined
    return {
      record,
      result,
      meetName: meet?.meetName ?? "-",
      hostDate: formatDate(meet?.hostDate),
    }
  })
})
</script>

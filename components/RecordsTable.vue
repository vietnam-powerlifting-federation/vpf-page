<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse border border-gray-300 dark:border-gray-700">
      <thead>
        <tr class="bg-gray-100 dark:bg-gray-800">
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.weightClass") }}
          </th>
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.name") }}
          </th>
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.yearOfBirth") }}
          </th>
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.bodyWeight") }}
          </th>
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.result") }}
          </th>
          <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
            {{ $t("records.date") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in records"
          :key="record.weightClass"
          class="hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            {{ formatWeightClass(record.weightClass) }}
          </td>
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            <template v-if="record.athlete">
              <NuxtLink
                :to="`/athletes/${record.athlete.vpfId}`"
                class="text-primary hover:underline"
              >
                {{ record.athlete.fullName }}
              </NuxtLink>
            </template>
            <span v-else class="text-gray-400">-</span>
          </td>
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            {{ record.athlete?.dob || "-" }}
          </td>
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            {{ record.bodyWeight ? formatWeight(record.bodyWeight) : "-" }}
          </td>
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            {{ record.weight ? formatWeight(record.weight) : "-" }}
          </td>
          <td class="border border-gray-300 dark:border-gray-700 px-4 py-2">
            {{ record.meet?.hostDate ? formatDate(record.meet.hostDate) : "-" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { UserPublic } from "~/types/users"
import type { MeetPublic } from "~/types/meets"

interface RecordRow {
  weightClass: number
  weight: number | null
  athlete?: UserPublic
  meet?: MeetPublic
  bodyWeight?: number | null
  vpfId?: string
  meetId?: number
}

defineProps<{
  records: RecordRow[]
  athletes: UserPublic[]
  meets: MeetPublic[]
  weightClasses: number[]
}>()

const formatWeightClass = (weightClass: number | null | undefined): string => {
  if (!weightClass) return "-"
  if (weightClass === 999) return "120+kg"
  return `${weightClass}kg`
}

const formatWeight = (weight: number | null | undefined): string => {
  if (weight === null || weight === undefined) return "-"
  return `${weight.toFixed(2)}`
}

const formatDate = (date: string | null | undefined): string => {
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
</script>


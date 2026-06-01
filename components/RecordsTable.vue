<template>
  <div class="overflow-x-auto">
    <DataTable :value="records" striped-rows show-gridlines>
      <Column :header="$t('general.weightClass')">
        <template #body="{ data }">
          {{ formatWeightClass(data.weightClass, props.sex) }}
        </template>
      </Column>
      <Column :header="$t('general.name')">
        <template #body="{ data }">
          <template v-if="data.athlete">
            <NuxtLinkLocale
              :to="`/openvpf/athletes/${data.athlete.slug || data.athlete.vpfId}`"
              class="text-primary hover:underline"
              :style="nameGradientStyle(data.athlete.decorator1, data.athlete.decorator2)"
            >
              {{ data.athlete.fullName }}
            </NuxtLinkLocale>
          </template>
          <span v-else class="text-surface-400">-</span>
        </template>
      </Column>
      <Column :header="$t('general.yearOfBirth')">
        <template #body="{ data }">
          {{ data.athlete?.dob || "-" }}
        </template>
      </Column>
      <Column :header="$t('general.bodyWeight')">
        <template #body="{ data }">
          {{ data.bodyWeight ? formatWeight(data.bodyWeight) : "-" }}
        </template>
      </Column>
      <Column :header="$t('general.result')">
        <template #body="{ data }">
          {{ data.weight ? formatWeight(data.weight) : "-" }}
        </template>
      </Column>
      <Column :header="$t('general.date')">
        <template #body="{ data }">
          {{ data.meet?.hostDate ? formatDate(data.meet.hostDate) : "-" }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import type { UserPublicWithDecorators } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex } from "~/types/union-types"
import { formatWeightClass, nameGradientStyle } from "@/lib/utils/client"

interface RecordRow {
  weightClass: number
  weight: number | null
  athlete?: UserPublicWithDecorators
  meet?: MeetPublic
  bodyWeight?: number | null
  vpfId?: string
  meetId?: number
}

const props = defineProps<{
  records: RecordRow[]
  athletes: UserPublicWithDecorators[]
  meets: MeetPublic[]
  weightClasses: number[]
  sex?: Sex | null
}>()

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

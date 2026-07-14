<template>
  <div class="overflow-x-auto">
    <DataTable :value="records" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
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
          {{ data.meet?.hostDate ? formatDateDMY(data.meet.hostDate) : "-" }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import type { UserPublicWithDecorators } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex } from "~/types/union-types"
import { formatWeightClass, nameGradientStyle } from "@/lib/utils/client"
import { formatDateDMY } from "@/lib/utils/date"

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
</script>

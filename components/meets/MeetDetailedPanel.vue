<template>
  <div>
    <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
    <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
      <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
      <div class="overflow-hidden">
          <DataTable
            :value="divisionGroup.results"
            :loading="false"
            striped-rows
            class="w-full border border-surface-200 dark:border-surface-700"
            row-group-mode="subheader"
            :pt="{ rowGroupHeaderCell: { colspan: 19 } }"
            group-rows-by="weightClass"
          >
            <template #groupheader="slotProps">
              <tr>
                <td colspan="19">
                  -{{ formatWeightClass(slotProps.data.weightClass, slotProps.data.sex) }}
                </td>
              </tr>
            </template>
            <Column field="placement" header="#" :sortable="true" style="width: 3rem" align="right">
              <template #body="{ data }">
                {{ formatPlacement(data.placement) }}
              </template>
            </Column>
            <Column field="athleteName" :header="$t('general.name')" :sortable="false" style="min-width: 180px" frozen>
              <template #body="{ data }">
                <NuxtLinkLocale
                  v-if="data.athlete"
                  :to="`/openvpf/athletes/${data.athlete.slug || data.athlete.vpfId}`"
                  class="hover:underline"
                  :style="nameGradientStyle(data.athlete.decorator1, data.athlete.decorator2)"
                >
                  {{ data.athlete.fullName }}
                </NuxtLinkLocale>
                <span v-else class="text-surface-400">-</span>
              </template>
            </Column>
            <Column field="bodyWeight" :header="$t('meets.bw')" :sortable="true" align="right" style="width: 4rem">
              <template #body="{ data }">
                {{ formatWeight(data.bodyWeight) }}
              </template>
            </Column>
            <Column header="SQ1" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.squat1)">{{ formatAttempt(data.squat1) }}</span>
              </template>
            </Column>
            <Column header="SQ2" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.squat2)">{{ formatAttempt(data.squat2) }}</span>
              </template>
            </Column>
            <Column header="SQ3" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.squat3)">{{ formatAttempt(data.squat3) }}</span>
              </template>
            </Column>
            <Column field="bestSquat" header="SQ" :sortable="true" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span class="font-semibold">{{ formatWeight(data.bestSquat) }}</span>
              </template>
            </Column>
            <Column field="squatPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
              <template #body="{ data }">
                {{ formatPlacement(data.squatPlacement) }}
              </template>
            </Column>
            <Column header="BP1" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.bench1)">{{ formatAttempt(data.bench1) }}</span>
              </template>
            </Column>
            <Column header="BP2" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.bench2)">{{ formatAttempt(data.bench2) }}</span>
              </template>
            </Column>
            <Column header="BP3" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.bench3)">{{ formatAttempt(data.bench3) }}</span>
              </template>
            </Column>
            <Column field="bestBench" header="BP" :sortable="true" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span class="font-semibold">{{ formatWeight(data.bestBench) }}</span>
              </template>
            </Column>
            <Column field="benchPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
              <template #body="{ data }">
                {{ formatPlacement(data.benchPlacement) }}
              </template>
            </Column>
            <Column header="DL1" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.deadlift1)">{{ formatAttempt(data.deadlift1) }}</span>
              </template>
            </Column>
            <Column header="DL2" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.deadlift2)">{{ formatAttempt(data.deadlift2) }}</span>
              </template>
            </Column>
            <Column header="DL3" :sortable="false" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span :class="getAttemptCellClass(data.deadlift3)">{{ formatAttempt(data.deadlift3) }}</span>
              </template>
            </Column>
            <Column field="bestDeadlift" header="DL" :sortable="true" align="right" style="width: 4rem">
              <template #body="{ data }">
                <span class="font-semibold">{{ formatWeight(data.bestDeadlift) }}</span>
              </template>
            </Column>
            <Column field="deadliftPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
              <template #body="{ data }">
                {{ formatPlacement(data.deadliftPlacement) }}
              </template>
            </Column>
            <Column field="total" :header="$t('general.total')" :sortable="true" align="right" style="width: 5rem">
              <template #body="{ data }">
                <span class="font-bold">{{ formatWeight(data.total) }}</span>
              </template>
            </Column>
          </DataTable>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { DISQUALIFIED } from "~/lib/constants/constants"
import { formatWeightClass, formatDivision, formatWeight, formatSexAlternative, nameGradientStyle } from "@/lib/utils/client"

const { slug } = defineProps<{ slug: string }>()
const { groupedByGenderDivision } = useMeetData(slug)

const formatPlacement = (placement: number | null | undefined): string => {
  if (placement === null || placement === undefined) return "-"
  if (placement === DISQUALIFIED) return "DSQ"
  return String(placement)
}

const formatAttempt = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined) return "-"
  if (attempt === 0) return "0"
  return attempt.toFixed(2)
}

const getAttemptCellClass = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined || attempt <= 0) {
    return "bg-surface-200 text-surface-700 px-1 py-0.5 rounded"
  }
  return "bg-primary/10 text-primary font-semibold px-1 py-0.5 rounded"
}
</script>

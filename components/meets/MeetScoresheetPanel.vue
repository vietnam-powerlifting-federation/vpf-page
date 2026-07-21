<template>
  <div>
    <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
    <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
      <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
      <div class="overflow-hidden">
          <DataTable
            :value="divisionGroup.results"
            :loading="false"
            striped-rows            class="w-full border border-surface-200 dark:border-surface-700"
            row-group-mode="subheader"
            :pt="{ rowGroupHeaderCell: { colspan: 12 } }"
            group-rows-by="weightClass"
          >
            <template #groupheader="slotProps">
              <tr>
                <td colspan="12">
                  -{{ formatWeightClass(slotProps.data.weightClass, slotProps.data.sex) }}
                </td>
              </tr>
            </template>
            <Column field="placement" :header="$t('meets.place')" :sortable="true" style="width: 5rem" align="right">
              <template #body="{ data }">
                {{ formatPlacement(data.placement) }}
              </template>
            </Column>
            <Column field="athleteName" :header="$t('general.name')" :sortable="false" style="min-width: 200px" frozen>
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
            <Column field="sex" :header="$t('meets.gender')" :sortable="false" align="right" style="width: 10rem">
              <template #body="{ data }">
                {{ formatSex(data.sex) }}
              </template>
            </Column>
            <Column field="division" :header="$t('general.division')" :sortable="false" align="right" style="width: 10rem">
              <template #body="{ data }">
                {{ formatDivision(data.division) }}
              </template>
            </Column>
            <Column field="squatPlacement" :header="$t('meets.squatPlace')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatPlacement(data.squatPlacement) }}
              </template>
            </Column>
            <Column field="bestSquat" :header="$t('general.squat')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatWeight(data.bestSquat) }}
              </template>
            </Column>
            <Column field="benchPlacement" :header="$t('meets.benchPlace')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatPlacement(data.benchPlacement) }}
              </template>
            </Column>
            <Column field="bestBench" :header="$t('general.bench')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatWeight(data.bestBench) }}
              </template>
            </Column>
            <Column field="deadliftPlacement" :header="$t('meets.deadliftPlace')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatPlacement(data.deadliftPlacement) }}
              </template>
            </Column>
            <Column field="bestDeadlift" :header="$t('general.deadlift')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatWeight(data.bestDeadlift) }}
              </template>
            </Column>
            <Column field="total" :header="$t('general.total')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatWeight(data.total) }}
              </template>
            </Column>
            <Column field="gl" :header="$t('general.gl')" :sortable="true" align="right" style="width: 8rem">
              <template #body="{ data }">
                {{ formatGL(data.gl) }}
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
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL, formatSexAlternative, nameGradientStyle } from "@/lib/utils/client"

const { slug } = defineProps<{ slug: string }>()
const { groupedByGenderDivision } = useMeetData(slug)

const formatPlacement = (placement: number | null | undefined): string => {
  if (placement === null || placement === undefined) return "-"
  if (placement === DISQUALIFIED) return "DSQ"
  return String(placement)
}
</script>

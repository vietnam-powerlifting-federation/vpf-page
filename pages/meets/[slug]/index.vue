<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingMeetDetails") }}</div>
        <div class="text-sm text-surface-500">{{ $t("general.pleaseWait") }}</div>
      </div>
    </div>

    <div v-else-if="error || !meet" class="text-center py-12">
      <div class="text-lg font-semibold mb-2 text-error">{{ $t("meets.errorLoadingMeet") }}</div>
      <div class="text-sm text-surface-500">{{ error || $t("meets.meetNotFound") }}</div>
    </div>

    <div v-else>
      <MeetHeader :meet="meet" :slug="slug" active-tab="scoresheet" />

      <!-- Scoresheet Tab Content -->
      <div class="mt-6">
        <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
          <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
            <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
            <div class="overflow-hidden">
              <ClientOnly>
                <!-- hack to fix colspan -->
                <DataTable
                  :value="divisionGroup.results"
                  :loading="false"
                  striped-rows
                  class="w-full"
                  show-gridlines
                  row-group-mode="subheader" 
                  :pt="{ rowGroupHeaderCell: { colspan: 12 }}" 
                  group-rows-by="weightClass"
                > 
                  <template #groupheader="slotProps">
                    <tr>
                      <td>
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
                      <NuxtLink
                        v-if="data.athlete"
                        :to="`/athletes/${data.athlete.vpfId}`"
                        class="text-primary hover:underline"
                      >
                        {{ data.athlete.fullName }}
                      </NuxtLink>
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
                <template #fallback>
                  <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                      <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingScoresheet") }}</div>
                    </div>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import MeetHeader from "@/components/meets/MeetHeader.vue"
import type { Sex, Division } from "~/types/union-types"
import { DISQUALIFIED } from "~/lib/constants/constants"
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL, formatSexAlternative } from "@/lib/utils/client"

const route = useRoute()
const slug = route.params.slug as string

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in"
  }
})

const { meet, resultsWithAthletes, pending, error } = useMeetData(slug)

// Order definitions
const sexOrder = ["male", "female"] satisfies Sex[]
const divisionOrder = ["open", "jr", "subjr", "mas1", "mas2", "mas3", "mas4", "guest"] satisfies Division[]

// Group results by gender -> division
const groupedByGenderDivision = computed(() => {
  const grouped: Record<Sex, Record<Division, typeof resultsWithAthletes.value>> = {} as Record<Sex, Record<Division, typeof resultsWithAthletes.value>>
  
  for (const result of resultsWithAthletes.value) {
    if (!grouped[result.sex]) {
      grouped[result.sex] = {} as Record<Division, typeof resultsWithAthletes.value>
    }
    if (!grouped[result.sex][result.division]) {
      grouped[result.sex][result.division] = []
    }
    grouped[result.sex][result.division].push(result)
  }
  
  // Sort each group by weight class, then by placement
  for (const sex in grouped) {
    for (const division in grouped[sex as Sex]) {
      grouped[sex as Sex][division as Division].sort((a, b) => {
        if (a.weightClass !== b.weightClass) {
          return a.weightClass - b.weightClass
        }
        return a.placement - b.placement
      })
    }
  }
  
  // Create ordered structure
  const ordered: Array<{ sex: Sex; divisions: Array<{ division: Division; results: typeof resultsWithAthletes.value }> }> = []
  
  for (const sex of sexOrder) {
    if (grouped[sex]) {
      const divisions: Array<{ division: Division; results: typeof resultsWithAthletes.value }> = []
      for (const division of divisionOrder) {
        if (grouped[sex][division] && grouped[sex][division].length > 0) {
          divisions.push({
            division,
            results: grouped[sex][division]
          })
        }
      }
      if (divisions.length > 0) {
        ordered.push({ sex, divisions })
      }
    }
  }
  
  return ordered
})

// Format functions
const formatPlacement = (placement: number | null | undefined): string => {
  if (placement === null || placement === undefined) return "-"
  if (placement === DISQUALIFIED) return "DSQ"
  return String(placement)
}

useSeoMeta({
  title: computed(() => meet.value ? `${meet.value.meetName} - VPF` : "VPF Meet"),
  ogType: "website",
  ogTitle: computed(() => meet.value ? meet.value.meetName : "VPF Meet"),
  ogDescription: computed(() => meet.value ? `View results and scoresheet for ${meet.value.meetName}` : "View meet results")
})
</script>


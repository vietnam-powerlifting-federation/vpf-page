<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-lg font-semibold mb-2 text">Loading meet details...</div>
        <div class="text-sm text-gray-500">Please wait while we load the data</div>
      </div>
    </div>

    <div v-else-if="error || !meet" class="text-center py-12">
      <div class="text-lg font-semibold mb-2 text-red-500">Error loading meet</div>
      <div class="text-sm text-gray-500">{{ error || "Meet not found" }}</div>
    </div>

    <div v-else>
      <MeetHeader :meet="meet" :slug="slug" active-tab="detailed" />

      <!-- Detailed Scoresheet Tab Content -->
      <div class="mt-6">
        <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
          <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
            <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
            <div class="overflow-hidden">
              <ClientOnly>
                <DataTable
                  :value="divisionGroup.results"
                  :loading="false"
                  striped-rows
                  class="w-full"
                  show-gridlines
                  row-group-mode="subheader" 
                  :pt="{ rowGroupHeaderCell: { colspan: 19 }}" 
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
                  
                  <Column field="athleteName" header="Name" :sortable="false" style="min-width: 180px" frozen>
                    <template #body="{ data }">
                      <NuxtLink
                        v-if="data.athlete"
                        :to="`/athletes/${data.athlete.vpfId}`"
                        class="text-primary hover:underline"
                      >
                        {{ data.athlete.fullName }}
                      </NuxtLink>
                      <span v-else class="text-gray-400">-</span>
                    </template>
                  </Column>
                  
                  <Column field="bodyWeight" header="BW" :sortable="true" align="right" style="width: 4rem">
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
                  
                  <Column field="squatPlacement" header="Pl." :sortable="true" align="right" style="width: 3rem">
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
                  
                  <Column field="benchPlacement" header="Pl." :sortable="true" align="right" style="width: 3rem">
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
                  
                  <Column field="deadliftPlacement" header="Pl." :sortable="true" align="right" style="width: 3rem">
                    <template #body="{ data }">
                      {{ formatPlacement(data.deadliftPlacement) }}
                    </template>
                  </Column>
                  
                  <Column field="total" header="Total" :sortable="true" align="right" style="width: 5rem">
                    <template #body="{ data }">
                      <span class="font-bold">{{ formatWeight(data.total) }}</span>
                    </template>
                  </Column>
                </DataTable>
                <template #fallback>
                  <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                      <div class="text-lg font-semibold mb-2 text">Loading detailed scoresheet...</div>
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
import { formatWeightClass, formatDivision, formatWeight, formatSexAlternative } from "@/lib/utils/client"

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

const formatAttempt = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined) return "-"
  if (attempt === 0) return "0"
  return attempt.toFixed(2)
}

const getAttemptCellClass = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined || attempt <= 0) {
    return "bg-pink-100 text-pink-800 px-1 py-0.5 rounded"
  }
  
  return "bg-green-100 text-green-800 font-semibold px-1 py-0.5 rounded"
}

useSeoMeta({
  title: computed(() => meet.value ? `${meet.value.meetName} - Detailed Scoresheet - VPF` : "VPF Meet"),
  ogType: "website",
  ogTitle: computed(() => meet.value ? `${meet.value.meetName} - Detailed Scoresheet` : "VPF Meet"),
  ogDescription: computed(() => meet.value ? `View detailed scoresheet for ${meet.value.meetName}` : "View detailed meet results")
})
</script>

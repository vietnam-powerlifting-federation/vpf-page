<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text">Athlete Rankings</h1>
    
    <!-- Filters -->
    <AthletesRankingFilter
      v-model:search="searchValue"
      v-model:sort="sortValue"
      v-model:sex="sexValue"
      v-model:division="divisionValue"
      v-model:weight-class="weightClassValue"
      v-model:meet-type="meetTypeValue"
      class="mb-6"
    />

    <!-- Data Table -->
    <div class="bg-surface-0 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
      <ClientOnly>
        <DataTable
          :value="finalRankedResults"
          :loading="loading"
          :paginator="true"
          :rows="50"
          :rows-per-page-options="[25, 50, 100]"
          :sort-field="sortField"
          :sort-order="sortOrder"
          striped-rows
          class="w-full"
        >
          <Column field="rank" header="#" :sortable="false" style="width: 5rem">
            <template #body="{ data }">
              {{ data.rank }}
            </template>
          </Column>
          
          <Column field="athleteName" header="Name" :sortable="false" style="min-width: 200px" frozen>
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
          
          <Column field="weightClass" header="Class" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeightClass(data.weightClass) }}
            </template>
          </Column>
          
          <Column field="sex" header="Sport Gender" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatSex(data.sex) }}
            </template>
          </Column>
          
          <Column field="division" header="Division" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatDivision(data.division) }}
            </template>
          </Column>
          
          <Column field="bestSquat" header="Squat" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestSquat) }}
            </template>
          </Column>
          
          <Column field="bestBench" header="Bench" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestBench) }}
            </template>
          </Column>
          
          <Column field="bestDeadlift" header="Deadlift" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestDeadlift) }}
            </template>
          </Column>
          
          <Column field="total" header="Total" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.total) }}
            </template>
          </Column>
          
          <Column field="gl" header="GL" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatGL(data.gl) }}
            </template>
          </Column>
        </DataTable>
        <template #fallback>
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="text-lg font-semibold mb-2 text">Loading rankings...</div>
              <div class="text-sm text-gray-500">Please wait while we load the data</div>
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from "@/components/volt/DataTable.vue"
import Column from "primevue/column"
import AthletesRankingFilter from "@/components/AthletesRankingFilter.vue"
import { useRankingFilters } from "@/composables/useRankingFilters"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import type { ApiResponse } from "~/types/api"
import type { Sex, Division, MeetType } from "~/types/union-types"

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in"
  }
})

useSeoMeta({
  title: "VPF Athlete Rankings",
  ogType: "website",
  ogTitle: "VPF Athlete Rankings",
  ogDescription: "Powerlifting athlete rankings for VPF (Vietnamese Powerlifting Federation)."
})

const filters = useRankingFilters()
const loading = ref(true)
const sortField = ref<string>("gl")
const sortOrder = ref<-1 | 0 | 1>(-1)

// Computed properties for v-model bindings
const searchValue = computed({
  get: () => filters.search.value,
  set: (val: string) => { filters.search.value = val }
})

const sortValue = computed({
  get: () => filters.sort.value,
  set: (val: string) => { filters.sort.value = val }
})

const sexValue = computed({
  get: () => filters.sex.value,
  set: (val: Sex | null) => { filters.sex.value = val }
})

const divisionValue = computed({
  get: () => filters.division.value,
  set: (val: Division | null) => { filters.division.value = val }
})

const weightClassValue = computed({
  get: () => filters.weightClass.value,
  set: (val: { weight: number | null; sex: Sex | null } | null) => { filters.weightClass.value = val || { weight: null, sex: null } }
})

const meetTypeValue = computed({
  get: () => filters.meetType.value,
  set: (val: MeetType | null) => { filters.meetType.value = val }
})

// Format weight class
const formatWeightClass = (weightClass: number | null | undefined): string => {
  if (!weightClass) return "-"
  if (weightClass === 999) return "120+kg"
  return `${weightClass}kg`
}

// Format sex
const formatSex = (sex: string | null | undefined): string => {
  if (!sex) return "-"
  return sex.charAt(0).toUpperCase() + sex.slice(1)
}

// Format division
const formatDivision = (division: string | null | undefined): string => {
  if (!division) return "-"
  const divisionMap: Record<string, string> = {
    open: "Open",
    jr: "Junior",
    subjr: "Sub-Junior",
    mas1: "Master I",
    mas2: "Master II",
    mas3: "Master III",
    mas4: "Master IV",
    guest: "Guest"
  }
  return divisionMap[division] || division
}

// Format weight
const formatWeight = (weight: number | null | undefined): string => {
  if (weight === null || weight === undefined) return "-"
  return weight.toFixed(2)
}

// Format GL points
const formatGL = (gl: number | null | undefined): string => {
  if (gl === null || gl === undefined) return "-"
  return gl.toFixed(2)
}

// Reactive query parameters for useFetch
const queryParams = computed(() => {
  const params: Record<string, string> = {
    distinct: "true"
  }
  
  if (filters.sort.value) {
    params.sort = filters.sort.value
  }
  
  if (filters.sex.value) {
    params.sex = filters.sex.value
  }
  
  if (filters.division.value) {
    params.division = filters.division.value
  }
  
  if (filters.weightClass.value?.weight != null) {
    params.weightClass = String(filters.weightClass.value.weight)
  }
  
  if (filters.meetType.value) {
    params.meetType = filters.meetType.value
  }
  
  return params
})

// Fetch results using useFetch with reactive query parameters
const { data: response, pending } = useFetch<ApiResponse<{
  results: Result[]
  meets: unknown[]
  athletes: UserPublic[]
}>>("/api/results", {
  query: queryParams
})

// Update loading state
watch(pending, (isPending) => {
  loading.value = isPending
}, { immediate: true })

// Process response data
const results = computed(() => {
  if (response.value?.success && response.value.data) {
    return response.value.data.results
  }
  return []
})

const athletes = computed(() => {
  if (response.value?.success && response.value.data) {
    const athletesMap = new Map<string, UserPublic>()
    for (const athlete of response.value.data.athletes) {
      athletesMap.set(athlete.vpfId, athlete)
    }
    return athletesMap
  }
  return new Map<string, UserPublic>()
})

// Computed: Ranked results with athlete data
const rankedResults = computed(() => {
  return results.value.map((result, index) => ({
    ...result,
    rank: index + 1,
    athlete: athletes.value.get(result.vpfId)
  }))
})

// Final ranked results with search filtering
const finalRankedResults = computed(() => {
  if (!filters.search.value) {
    return rankedResults.value
  }
  
  const searchLower = filters.search.value.toLowerCase()
  return rankedResults.value.filter(result => {
    const athlete = result.athlete
    if (!athlete) return false
    return athlete.fullName?.toLowerCase().includes(searchLower) ||
           athlete.vpfId?.toLowerCase().includes(searchLower)
  })
})
</script>

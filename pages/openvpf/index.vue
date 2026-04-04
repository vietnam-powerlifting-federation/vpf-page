<template>
  <div class="min-h-full dark-bg">
    <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("ranking.title") }}</h1>
    
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
    <div class="overflow-hidden">
      <ClientOnly>
        <DataTable
          :value="finalRankedResults"
          :paginator="true"
          :rows="50"
          :rows-per-page-options="[25, 50, 100]"
          striped-rows
          class="w-full border border-surface-200 dark:border-surface-700"
        >
          <Column field="rank" header="#" :sortable="false" style="width: 5rem" align="right">
            <template #body="{ data }">
              {{ data.rank }}
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
          
          <Column field="weightClass" :header="$t('general.weightClass')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeightClass(data.weightClass, data.sex) }}
            </template>
          </Column>
          
          <Column field="sex" :header="$t('general.sportGender')" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatSex(data.sex) }}
            </template>
          </Column>
          
          <Column field="division" :header="$t('general.division')" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatDivision(data.division) }}
            </template>
          </Column>
          
          <Column field="bestSquat" :header="$t('general.squat')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestSquat) }}
            </template>
          </Column>
          
          <Column field="bestBench" :header="$t('general.bench')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestBench) }}
            </template>
          </Column>
          
          <Column field="bestDeadlift" :header="$t('general.deadlift')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestDeadlift) }}
            </template>
          </Column>
          
          <Column field="total" :header="$t('general.total')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.total) }}
            </template>
          </Column>
          
          <Column field="gl" :header="$t('general.gl')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatGL(data.gl) }}
            </template>
          </Column>
        </DataTable>
        <template #fallback>
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="text-lg font-semibold mb-2 text-primary">{{ $t("ranking.loading") }}</div>
              <div class="text-sm text-surface-500">{{ $t("general.pleaseWait") }}</div>
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import AthletesRankingFilter from "@/components/AthletesRankingFilter.vue"
import { useRankingFilters } from "@/composables/useRankingFilters"
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL, nameGradientStyle } from "@/lib/utils/client"
import type { ResultRanked } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"
import type { ApiResponse } from "~/types/api"
import type { Sex, Division, MeetType } from "~/types/union-types"
import type { MeetPublic } from "~/types/meets"

definePageMeta({
  layout: "openvpf",
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
  results: ResultRanked[]
  meets: MeetPublic[]
  athletes: UserPublicWithDecorators[]
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
    return response.value.data.athletes
  }
  return []
})

// Results with athlete data
const resultsWithAthletes = computed(() => {
  return results.value.map(result => ({
    ...result,
    athlete: athletes.value.find(athlete => athlete.vpfId === result.vpfId)
  }))
})

// Final ranked results with search filtering
const finalRankedResults = computed(() => {
  let filtered = resultsWithAthletes.value
  
  if (filters.search.value) {
    const searchLower = filters.search.value.toLowerCase()
    filtered = filtered.filter(result => {
      const athlete = result.athlete
      if (!athlete) return false
      return athlete.fullName?.toLowerCase().includes(searchLower) ||
             athlete.vpfId?.toLowerCase().includes(searchLower)
    })
  }
  
  return filtered.sort((a, b) => a.rank - b.rank)
})
</script>

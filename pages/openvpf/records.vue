<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("records.title") }}</h1>

        <!-- View Mode Toggle -->
        <div class="max-w-5xl mx-auto mb-6">
          <div class="flex gap-4 justify-center">
            <Button
              :severity="viewMode === 'current' ? undefined : 'secondary'"
              @click="viewMode = 'current'"
            >
              {{ $t("records.currentRecords") }}
            </Button>
            <Button
              :severity="viewMode === 'history' ? undefined : 'secondary'"
              @click="viewMode = 'history'"
            >
              {{ $t("records.recordHistory") }}
            </Button>
          </div>
          <p v-if="viewMode === 'history'" class="text-sm text-surface-600 dark:text-surface-400 text-center mt-2">
            {{ $t("records.historyDescription") }}
          </p>
        </div>

        <!-- Filters -->
        <div class="max-w-5xl mx-auto mb-8">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                {{ $t("general.sportGender") }}
              </label>
              <Select
                v-model="selectedSex"
                :options="sexOptions"
                option-label="label"
                option-value="value"
                :placeholder="$t('records.selectGender')"
                class="w-full"
                @update:model-value="handleFilterChange"
              />
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                {{ $t("general.division") }}
              </label>
              <Select
                v-model="selectedDivision"
                :options="divisionOptions"
                option-label="label"
                option-value="value"
                :placeholder="$t('records.selectDivision')"
                class="w-full"
                @update:model-value="handleFilterChange"
              />
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                {{ $t("general.year") }}
              </label>
              <Select
                v-model="selectedYear"
                :options="yearOptions"
                option-label="label"
                option-value="value"
                :placeholder="$t('records.selectYear')"
                class="w-full"
                @update:model-value="handleFilterChange"
              />
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="displayPending" class="max-w-5xl mx-auto text-center py-12">
          <ProgressSpinner />
          <p class="mt-4 text-surface-600">{{ $t("general.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="displayError" class="max-w-5xl mx-auto text-center py-12">
          <p class="text-error">{{ $t("general.error") }}</p>
        </div>

        <!-- Records Tables -->
        <div v-else-if="displayData" class="max-w-5xl mx-auto">
          <!-- History Mode: Show meet info if available -->
          <div v-if="viewMode === 'history' && historyData?.data?.meet" class="mb-8 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">{{ historyData.data.meet.meetName }}</h3>
            <p v-if="historyData.data.meet.hostDate" class="text-sm text-surface-600 dark:text-surface-400">
              {{ $t("general.date") }}: {{ formatDateDMY(historyData.data.meet.hostDate) }}
            </p>
          </div>

          <!-- No records message for history -->
          <div v-if="viewMode === 'history' && (!historyData?.data?.records || historyData.data.records.length === 0)" class="text-center py-12">
            <p class="text-surface-600 dark:text-surface-400">{{ $t("records.noHistoryFound") }}</p>
          </div>

          <!-- History Mode: Show list view -->
          <div v-if="viewMode === 'history' && historyData?.data?.records && historyData.data.records.length > 0">
            <RecordsHistoryList
              :records="filteredHistoryRecords"
              :athletes="displayAthletes"
              :results="historyData?.data?.results ?? []"
              :previous-records-map="previousRecordsMap"
            />
          </div>

          <!-- Current Records Mode: Show table view -->
          <!-- Squat Records -->
          <div v-if="viewMode === 'current' && filteredRecords.squat.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("general.squat") }}</h2>
            <RecordsTable
              :records="filteredRecords.squat"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
              :sex="selectedSex"
            />
          </div>

          <!-- Bench Press Records -->
          <div v-if="viewMode === 'current' && filteredRecords.bench.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("general.benchPress") }}</h2>
            <RecordsTable
              :records="filteredRecords.bench"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
              :sex="selectedSex"
            />
          </div>

          <!-- Deadlift Records -->
          <div v-if="viewMode === 'current' && filteredRecords.deadlift.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("general.deadlift") }}</h2>
            <RecordsTable
              :records="filteredRecords.deadlift"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
              :sex="selectedSex"
            />
          </div>

          <!-- Total Records -->
          <div v-if="viewMode === 'current' && filteredRecords.total.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("general.total") }}</h2>
            <RecordsTable
              :records="filteredRecords.total"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
              :sex="selectedSex"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import RecordsTable from "@/components/RecordsTable.vue"
import RecordsHistoryList from "@/components/RecordsHistoryList.vue"
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, RECORD_START_YEAR } from "~/lib/constants/constants"
import { formatDateDMY } from "~/lib/utils/date"
import type { LiftRecord } from "~/types/records"
import type { Result } from "~/types/results"
import type { UserPublicWithDecorators } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex, Division } from "~/types/union-types"
import type { ApiResponse } from "~/types/api"

type RecordsData = {
  records: LiftRecord[]
  meet: MeetPublic[]
  athletes: UserPublicWithDecorators[]
  results: Result[]
}
type HistoryData = Omit<RecordsData, "meet"> & { meet: MeetPublic | null }

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { fetchDecorators, applyDecorators } = useNameDecorators()
onMounted(fetchDecorators)

// View mode: 'current' or 'history'
const initialViewMode = (route.query.mode as "current" | "history") || "current"
const viewMode = ref<"current" | "history">(initialViewMode)

// Filter states
const selectedSex = ref<Sex | null>((route.query.sex as Sex) || "male")
const selectedDivision = ref<Division | null>((route.query.division as Division) || "open")
const selectedYear = ref<number | null>(
  route.query.year ? parseInt(route.query.year as string, 10) : null
)

// Options
const sexOptions = computed(() => [
  { label: t("general.male"), value: "male" },
  { label: t("general.female"), value: "female" },
])

const divisionOptions = computed(() => [
  { label: t("general.divisionSubJunior"), value: "subjr" },
  { label: t("general.divisionJunior"), value: "jr" },
  { label: t("general.divisionOpen"), value: "open" },
  { label: t("general.divisionMaster1"), value: "mas1" },
  { label: t("general.divisionMaster2"), value: "mas2" },
  { label: t("general.divisionMaster3"), value: "mas3" },
  { label: t("general.divisionMaster4"), value: "mas4" },
])

// Fetch available years from API (we'll get this from meets data)
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years: { label: string; value: number | null }[] = [{ label: t("records.allYears"), value: null }]
  // Generate years from RECORD_START_YEAR to current year + 1
  for (let year = RECORD_START_YEAR; year <= currentYear + 1; year++) {
    years.push({ label: year.toString(), value: year })
  }
  return years.reverse() // Most recent first
})

// Weight classes based on selected sex
const weightClasses = computed(() => {
  return selectedSex.value === "female" ? WEIGHT_CLASS_FEMALE : WEIGHT_CLASS_MALE
})

// Fetch current records data
const { data, pending, error, refresh } = await useFetch<ApiResponse<RecordsData>>("/api/records", {
  query: computed(() => {
    const query: Record<string, string | number | undefined> = {}
    if (selectedYear.value !== null) {
      query.year = selectedYear.value
    }
    return query
  }),
  immediate: initialViewMode === "current",
})

// Fetch history records data
const { data: historyData, pending: historyPending, error: historyError, refresh: refreshHistory } = await useFetch<ApiResponse<HistoryData>>("/api/records/history", {
  query: computed(() => {
    const query: Record<string, string | number | undefined> = {}
    if (selectedYear.value !== null) {
      query.year = selectedYear.value
    }
    return query
  }),
  immediate: initialViewMode === "history",
})

// Fetch previous year records for history view (to show previous record values)
const { data: previousYearRecords } = await useFetch<ApiResponse<RecordsData>>("/api/records", {
  query: computed(() => {
    const query: Record<string, string | number | undefined> = {}
    if (selectedYear.value !== null && viewMode.value === "history") {
      query.year = selectedYear.value - 1
    }
    return query
  }),
  immediate: initialViewMode === "history" && selectedYear.value !== null,
})

// Create a map of previous records for history view
const previousRecordsMap = computed(() => {
  const map = new Map<string, number>()
  const prevData = previousYearRecords.value?.data
  if (prevData?.records && prevData?.results) {
    const prevResultsById = new Map(prevData.results.map(r => [r.resultId, r]))
    for (const record of prevData.records) {
      const result = prevResultsById.get(record.resultId)
      if (!result) continue
      const key = `${result.sex}-${record.recordDivision}-${result.weightClass}-${record.lift}`
      const currentBest = map.get(key) ?? 0
      if (record.recordWeight > currentBest) {
        map.set(key, record.recordWeight)
      }
    }
  }
  return map
})

// Computed properties for display
const displayData = computed(() => {
  if (viewMode.value === "history") {
    return historyData.value?.data
  }
  return data.value?.data
})

const displayPending = computed(() => {
  return viewMode.value === "history" ? historyPending.value : pending.value
})

const displayError = computed(() => {
  return viewMode.value === "history" ? historyError.value : error.value
})

const displayAthletes = computed(() => {
  return applyDecorators(displayData.value?.athletes ?? [])
})

const displayMeets = computed(() => {
  if (viewMode.value === "history") {
    const meet = historyData.value?.data?.meet
    return meet ? [meet] : []
  }
  return data.value?.data?.meet ?? []
})

// Filter and group records using the API's pre-calculated records
const filteredRecords = computed(() => {
  if (!data.value?.data) {
    return { squat: [], bench: [], deadlift: [], total: [] }
  }

  const { records, results: currentResults } = data.value.data
  const resultsById = new Map(currentResults.map(r => [r.resultId, r]))
  const weightClassesList = weightClasses.value

  const meetsMap = new Map<number, MeetPublic>()
  displayMeets.value.forEach((m) => meetsMap.set(m.meetId, m))

  const athletesMap = new Map<string, UserPublicWithDecorators>()
  displayAthletes.value.forEach((a) => athletesMap.set(a.vpfId, a))

  const filtered = records.filter((record) => {
    const result = resultsById.get(record.resultId)
    return result?.sex == selectedSex.value && record.recordDivision === selectedDivision.value
  })

  type RecordRow = {
    weightClass: number
    weight: number | null
    athlete?: UserPublicWithDecorators
    meet?: MeetPublic
    bodyWeight?: number | null
    vpfId?: string
    meetId?: number
  }

  const grouped: { squat: RecordRow[]; bench: RecordRow[]; deadlift: RecordRow[]; total: RecordRow[] } = {
    squat: [], bench: [], deadlift: [], total: [],
  }

  for (const weightClass of weightClassesList) {
    for (const lift of ["squat", "bench", "deadlift", "total"] as const) {
      const rec = filtered.find(r => {
        const result = resultsById.get(r.resultId)
        return r.lift === lift && result?.weightClass === weightClass
      })
      const result = rec ? resultsById.get(rec.resultId) : undefined
      grouped[lift].push(
        rec && result
          ? {
            weightClass,
            weight: rec.recordWeight,
            athlete: athletesMap.get(result.vpfId),
            meet: meetsMap.get(result.meetId),
            bodyWeight: result.bodyWeight,
            vpfId: result.vpfId,
            meetId: result.meetId,
          }
          : { weightClass, weight: null }
      )
    }
  }

  return grouped
})

// Filter history records by sex and division
const filteredHistoryRecords = computed(() => {
  const histData = historyData.value?.data
  if (!histData?.records) return []

  const resultsById = new Map((histData.results ?? []).map(r => [r.resultId, r]))

  return histData.records.filter((record) => {
    const result = resultsById.get(record.resultId)
    return result?.sex == selectedSex.value && record.recordDivision === selectedDivision.value
  })
})

// Handle filter changes
const handleFilterChange = () => {
  // Update URL query params
  const query: Record<string, string | number> = {}
  query.mode = viewMode.value
  if (selectedSex.value) query.sex = selectedSex.value
  if (selectedDivision.value) query.division = selectedDivision.value
  if (selectedYear.value) query.year = selectedYear.value

  router.push({ query })
  
  if (viewMode.value === "current") {
    refresh()
  } else {
    refreshHistory()
  }
}

// Watch view mode changes
watch(viewMode, () => {
  handleFilterChange()
})

// Watch for route changes
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.mode) viewMode.value = newQuery.mode as "current" | "history"
    if (newQuery.sex) selectedSex.value = newQuery.sex as Sex
    if (newQuery.division) selectedDivision.value = newQuery.division as Division
    if (newQuery.year) selectedYear.value = parseInt(newQuery.year as string, 10)
  }
)

definePageMeta({
  layout: "openvpf",
})
</script>

<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("records.title") }}</h1>

        <!-- View Mode Toggle -->
        <div class="max-w-5xl mx-auto mb-6">
          <div class="flex gap-4 justify-center">
            <Button
              v-if="viewMode === 'current'"
              @click="viewMode = 'current'"
            >
              {{ $t("records.currentRecords") }}
            </Button>
            <SecondaryButton
              v-else
              @click="viewMode = 'current'"
            >
              {{ $t("records.currentRecords") }}
            </SecondaryButton>
            <Button
              v-if="viewMode === 'history'"
              @click="viewMode = 'history'"
            >
              {{ $t("records.recordHistory") }}
            </Button>
            <SecondaryButton
              v-else
              @click="viewMode = 'history'"
            >
              {{ $t("records.recordHistory") }}
            </SecondaryButton>
          </div>
          <p v-if="viewMode === 'history'" class="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
            {{ $t("records.historyDescription") }}
          </p>
        </div>

        <!-- Filters -->
        <div class="max-w-5xl mx-auto mb-8">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t("records.sportGender") }}
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
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t("records.division") }}
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
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t("records.year") }}
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
          <p class="mt-4 text-gray-600">{{ $t("records.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="displayError" class="max-w-5xl mx-auto text-center py-12">
          <p class="text-red-600">{{ $t("records.error") }}</p>
        </div>

        <!-- Records Tables -->
        <div v-else-if="displayData" class="max-w-5xl mx-auto">
          <!-- History Mode: Show meet info if available -->
          <div v-if="viewMode === 'history' && historyData?.data?.meet" class="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">{{ historyData.data.meet.meetName }}</h3>
            <p v-if="historyData.data.meet.hostDate" class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t("records.date") }}: {{ formatDate(historyData.data.meet.hostDate) }}
            </p>
          </div>

          <!-- No records message for history -->
          <div v-if="viewMode === 'history' && (!historyData?.data?.records || historyData.data.records.length === 0)" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t("records.noHistoryFound") }}</p>
          </div>

          <!-- History Mode: Show list view -->
          <div v-if="viewMode === 'history' && historyData?.data?.records && historyData.data.records.length > 0">
            <RecordsHistoryList
              :records="filteredHistoryRecords"
              :athletes="displayAthletes"
              :previous-records-map="previousRecordsMap"
            />
          </div>

          <!-- Current Records Mode: Show table view -->
          <!-- Squat Records -->
          <div v-if="viewMode === 'current' && displayRecords.squat.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.squat") }}</h2>
            <RecordsTable
              :records="displayRecords.squat"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Bench Press Records -->
          <div v-if="viewMode === 'current' && displayRecords.bench.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.benchPress") }}</h2>
            <RecordsTable
              :records="displayRecords.bench"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Deadlift Records -->
          <div v-if="viewMode === 'current' && displayRecords.deadlift.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.deadlift") }}</h2>
            <RecordsTable
              :records="displayRecords.deadlift"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Total Records -->
          <div v-if="viewMode === 'current' && displayRecords.total.length > 0" class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.total") }}</h2>
            <RecordsTable
              :records="displayRecords.total"
              :athletes="displayAthletes"
              :meets="displayMeets"
              :weight-classes="weightClasses"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import Select from "@/components/volt/Select.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import Button from "@/components/volt/Button.vue"
import SecondaryButton from "@/components/volt/SecondaryButton.vue"
import RecordsTable from "@/components/RecordsTable.vue"
import RecordsHistoryList from "@/components/RecordsHistoryList.vue"
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, RECORD_START_YEAR } from "~/lib/constants/constants"
import type { LiftRecord } from "~/types/records"
import type { UserPublic } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex, Division } from "~/types/union-types"

const route = useRoute()
const router = useRouter()

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
const sexOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
]

const divisionOptions = [
  { label: "Sub-Junior", value: "subjr" },
  { label: "Junior", value: "jr" },
  { label: "Open", value: "open" },
  { label: "Masters 1", value: "mas1" },
  { label: "Masters 2", value: "mas2" },
  { label: "Masters 3", value: "mas3" },
  { label: "Masters 4", value: "mas4" },
]

// Fetch available years from API (we'll get this from meets data)
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  // Add "All Years" option
  years.push({ label: "All Years", value: null })
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
const { data, pending, error, refresh } = await useFetch<{
  success: boolean
  data: {
    records: LiftRecord[]
    meet: MeetPublic[]
    athletes: UserPublic[]
  } | null
  message: {
    en: string
    vi: string
  }
}>("/api/records", {
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
const { data: historyData, pending: historyPending, error: historyError, refresh: refreshHistory } = await useFetch<{
  success: boolean
  data: {
    records: LiftRecord[]
    meet: MeetPublic | null
    athletes: UserPublic[]
  } | null
  message: {
    en: string
    vi: string
  }
}>("/api/records/history", {
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
const { data: previousYearRecords } = await useFetch<{
  success: boolean
  data: {
    records: LiftRecord[]
    meet: MeetPublic[]
    athletes: UserPublic[]
  } | null
}>("/api/records", {
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
  if (previousYearRecords.value?.data?.records) {
    for (const record of previousYearRecords.value.data.records) {
      const key = `${record.sex}-${record.recordDivision}-${record.weightClass}-${record.lift}`
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
  return displayData.value?.athletes ?? []
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
  if (!displayData.value) {
    return {
      squat: [],
      bench: [],
      deadlift: [],
      total: [],
    }
  }

  const records = displayData.value.records
  const meets = displayMeets.value
  const athletes = displayAthletes.value
  const weightClassesList = weightClasses.value

  // Create maps for quick lookup
  const meetsMap = new Map<number, MeetPublic>()
  meets.forEach((m) => meetsMap.set(m.meetId, m))

  const athletesMap = new Map<string, UserPublic>()
  athletes.forEach((a) => athletesMap.set(a.vpfId, a))

  // Filter records by sex and division
  const filteredRecordsWithMetadata = records
    .filter((record) => {
      return selectedSex.value == record.sex && selectedDivision.value === record.recordDivision
    })

  // Type for record row (matches RecordsTable's RecordRow interface)
  type RecordRow = {
    weightClass: number
    weight: number | null
    athlete?: UserPublic
    meet?: MeetPublic
    bodyWeight?: number | null
    vpfId?: string
    meetId?: number
  }

  // Group records by lift type and weight class
  const grouped: {
    squat: RecordRow[]
    bench: RecordRow[]
    deadlift: RecordRow[]
    total: RecordRow[]
  } = {
    squat: [],
    bench: [],
    deadlift: [],
    total: [],
  }

  // For each weight class, find the matching record
  for (const weightClass of weightClassesList) {
    // Squat
    const squatRecord = filteredRecordsWithMetadata.find(
      (record) => record.lift === "squat" && record.weightClass === weightClass
    )
    grouped.squat.push(
      squatRecord
        ? {
          weightClass,
          weight: squatRecord.recordWeight,
          athlete: athletesMap.get(squatRecord.vpfId),
          meet: meetsMap.get(squatRecord.meetId),
          bodyWeight: squatRecord.bodyWeight,
          vpfId: squatRecord.vpfId,
          meetId: squatRecord.meetId,
        }
        : { weightClass, weight: null }
    )

    // Bench
    const benchRecord = filteredRecordsWithMetadata.find(
      (record) => record.lift === "bench" && record.weightClass === weightClass
    )
    grouped.bench.push(
      benchRecord
        ? {
          weightClass,
          weight: benchRecord.recordWeight,
          athlete: athletesMap.get(benchRecord.vpfId),
          meet: meetsMap.get(benchRecord.meetId),
          bodyWeight: benchRecord.bodyWeight,
          vpfId: benchRecord.vpfId,
          meetId: benchRecord.meetId,
        }
        : { weightClass, weight: null }
    )

    // Deadlift
    const deadliftRecord = filteredRecordsWithMetadata.find(
      (record) => record.lift === "deadlift" && record.weightClass === weightClass
    )
    grouped.deadlift.push(
      deadliftRecord
        ? {
          weightClass,
          weight: deadliftRecord.recordWeight,
          athlete: athletesMap.get(deadliftRecord.vpfId),
          meet: meetsMap.get(deadliftRecord.meetId),
          bodyWeight: deadliftRecord.bodyWeight,
          vpfId: deadliftRecord.vpfId,
          meetId: deadliftRecord.meetId,
        }
        : { weightClass, weight: null }
    )

    // Total
    const totalRecord = filteredRecordsWithMetadata.find(
      (record) => record.lift === "total" && record.weightClass === weightClass
    )
    grouped.total.push(
      totalRecord
        ? {
          weightClass,
          weight: totalRecord.recordWeight,
          athlete: athletesMap.get(totalRecord.vpfId),
          meet: meetsMap.get(totalRecord.meetId),
          bodyWeight: totalRecord.bodyWeight,
          vpfId: totalRecord.vpfId,
          meetId: totalRecord.meetId,
        }
        : { weightClass, weight: null }
    )
  }

  return grouped
})

// Display records (same as filteredRecords but with better naming)
const displayRecords = computed(() => filteredRecords.value)

// Filter history records by sex and division
const filteredHistoryRecords = computed(() => {
  if (!historyData.value?.data?.records) {
    return []
  }

  const records = historyData.value.data.records

  return records.filter((record) => {
    return selectedSex.value == record.sex && selectedDivision.value === record.recordDivision
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

// Watch for viewMode and selectedYear changes to fetch previous year records
watch([viewMode, selectedYear], ([newMode, newYear]) => {
  if (newMode === "history" && newYear !== null) {
    // The query will automatically update and trigger a fetch
  }
})

// Format date helper
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
</script>

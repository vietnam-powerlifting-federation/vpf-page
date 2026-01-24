<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("records.title") }}</h1>

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
        <div v-if="pending" class="max-w-5xl mx-auto text-center py-12">
          <ProgressSpinner />
          <p class="mt-4 text-gray-600">{{ $t("records.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="max-w-5xl mx-auto text-center py-12">
          <p class="text-red-600">{{ $t("records.error") }}</p>
        </div>

        <!-- Records Tables -->
        <div v-else-if="data?.data" class="max-w-5xl mx-auto">
          <!-- Squat Records -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.squat") }}</h2>
            <RecordsTable
              :records="filteredRecords.squat"
              :athletes="data.data.athletes"
              :meets="data.data.meet"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Bench Press Records -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.benchPress") }}</h2>
            <RecordsTable
              :records="filteredRecords.bench"
              :athletes="data.data.athletes"
              :meets="data.data.meet"
              :results="data.data.records"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Deadlift Records -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.deadlift") }}</h2>
            <RecordsTable
              :records="filteredRecords.deadlift"
              :athletes="data.data.athletes"
              :meets="data.data.meet"
              :results="data.data.records"
              :weight-classes="weightClasses"
            />
          </div>

          <!-- Total Records -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("records.total") }}</h2>
            <RecordsTable
              :records="filteredRecords.total"
              :athletes="data.data.athletes"
              :meets="data.data.meet"
              :results="data.data.records"
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
import RecordsTable from "@/components/RecordsTable.vue"
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, RECORD_START_YEAR } from "~/lib/constants/constants"
import type { LiftRecord } from "~/types/records"
import type { UserPublic } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Sex, Division } from "~/types/union-types"

const route = useRoute()
const router = useRouter()

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

// Fetch records data
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
})

// Filter and group records using the API's pre-calculated records
const filteredRecords = computed(() => {
  if (!data.value?.data) {
    return {
      squat: [],
      bench: [],
      deadlift: [],
      total: [],
    }
  }

  const records = data.value.data.records
  const meets = data.value.data.meet
  const athletes = data.value.data.athletes
  const weightClassesList = weightClasses.value

  // Create maps for quick lookup
  const meetsMap = new Map<number, MeetPublic>()
  meets.forEach((m) => meetsMap.set(m.meetId, m))

  const athletesMap = new Map<string, UserPublic>()
  athletes.forEach((a) => athletesMap.set(a.vpfId, a))

  // Division promotion logic: younger divisions can compete in older ones
  const RECPRD_DIVISION_OVERRIDE: Record<string, Division[]> = {
    open: ["open"],
    jr: ["jr", "open"],
    subjr: ["subjr", "jr", "open"],
    mas1: ["mas1", "open"],
    mas2: ["mas2", "mas1", "open"],
    mas3: ["mas3", "mas2", "mas1", "open"],
    mas4: ["mas4", "mas3", "mas2", "mas1", "open"],
  }

  // Filter records by sex and division
  const filteredRecordsWithMetadata = records
    .filter((record) => {
      // Filter by sex
      if (record.sex !== selectedSex.value) return false

      // Filter by division (with promotion logic)
      if (selectedDivision.value) {
        const divisionsThatCanCompete: Division[] = []
        for (const [div, allowed] of Object.entries(RECPRD_DIVISION_OVERRIDE)) {
          if (allowed.includes(selectedDivision.value)) {
            divisionsThatCanCompete.push(div as Division)
          }
        }
        if (!divisionsThatCanCompete.includes(record.recordDivision)) return false
      }

      return true
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

// Handle filter changes
const handleFilterChange = () => {
  // Update URL query params
  const query: Record<string, string | number> = {}
  if (selectedSex.value) query.sex = selectedSex.value
  if (selectedDivision.value) query.division = selectedDivision.value
  if (selectedYear.value) query.year = selectedYear.value

  router.push({ query })
  refresh()
}

// Watch for route changes
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.sex) selectedSex.value = newQuery.sex as Sex
    if (newQuery.division) selectedDivision.value = newQuery.division as Division
    if (newQuery.year) selectedYear.value = parseInt(newQuery.year as string, 10)
  }
)
</script>

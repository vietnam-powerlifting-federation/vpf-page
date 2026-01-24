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
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('records.selectGender')"
                class="w-full"
                @update:modelValue="handleFilterChange"
              />
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t("records.division") }}
              </label>
              <Select
                v-model="selectedDivision"
                :options="divisionOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('records.selectDivision')"
                class="w-full"
                @update:modelValue="handleFilterChange"
              />
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t("records.year") }}
              </label>
              <Select
                v-model="selectedYear"
                :options="yearOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('records.selectYear')"
                class="w-full"
                @update:modelValue="handleFilterChange"
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
              :results="data.data.results"
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
              :results="data.data.results"
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
              :results="data.data.results"
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
              :results="data.data.results"
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
import { WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE, DIVISION, RECORD_START_YEAR } from "~/lib/constants/constants"
import type { Record } from "~/types/records"
import type { UserPublic } from "~/types/users"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
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
    records: Record[]
    meet: MeetPublic[]
    athletes: UserPublic[]
    results: Result[]
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

// Filter and group records by matching with results
const filteredRecords = computed(() => {
  if (!data.value?.data) {
    return {
      squat: [],
      bench: [],
      deadlift: [],
      total: [],
    }
  }

  const results = data.value.data.results
  const meets = data.value.data.meet
  const athletes = data.value.data.athletes
  const weightClassesList = weightClasses.value

  // Filter results by selected sex and division
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

  const filteredResults = results.filter((r) => {
    if (r.sex !== selectedSex.value) return false
    
    if (selectedDivision.value) {
      // Find all divisions that can compete in the selected division
      const divisionsThatCanCompete: Division[] = []
      for (const [div, allowed] of Object.entries(RECPRD_DIVISION_OVERRIDE)) {
        if (allowed.includes(selectedDivision.value)) {
          divisionsThatCanCompete.push(div as Division)
        }
      }
      
      // Include result if its division can compete in the selected division
      if (!divisionsThatCanCompete.includes(r.division)) return false
    }
    
    return true
  })

  const grouped: {
    squat: any[]
    bench: any[]
    deadlift: any[]
    total: any[]
  } = {
    squat: [],
    bench: [],
    deadlift: [],
    total: [],
  }

  // For each weight class, find the best record
  for (const weightClass of weightClassesList) {
    const weightClassResults = filteredResults.filter((r) => r.weightClass === weightClass)

    // Squat
    const squatResults = weightClassResults
      .filter((r) => r.bestSquat && r.bestSquat > 0)
      .sort((a, b) => (b.bestSquat || 0) - (a.bestSquat || 0))
    const bestSquat = squatResults[0]
    grouped.squat.push(
      bestSquat
        ? {
            weightClass,
            weight: bestSquat.bestSquat,
            athlete: athletes.find((a) => a.vpfId === bestSquat.vpfId),
            meet: meets.find((m) => m.meetId === bestSquat.meetId),
            bodyWeight: bestSquat.bodyWeight,
            vpfId: bestSquat.vpfId,
            meetId: bestSquat.meetId,
          }
        : { weightClass, weight: null }
    )

    // Bench
    const benchResults = weightClassResults
      .filter((r) => r.bestBench && r.bestBench > 0)
      .sort((a, b) => (b.bestBench || 0) - (a.bestBench || 0))
    const bestBench = benchResults[0]
    grouped.bench.push(
      bestBench
        ? {
            weightClass,
            weight: bestBench.bestBench,
            athlete: athletes.find((a) => a.vpfId === bestBench.vpfId),
            meet: meets.find((m) => m.meetId === bestBench.meetId),
            bodyWeight: bestBench.bodyWeight,
            vpfId: bestBench.vpfId,
            meetId: bestBench.meetId,
          }
        : { weightClass, weight: null }
    )

    // Deadlift
    const deadliftResults = weightClassResults
      .filter((r) => r.bestDeadlift && r.bestDeadlift > 0)
      .sort((a, b) => (b.bestDeadlift || 0) - (a.bestDeadlift || 0))
    const bestDeadlift = deadliftResults[0]
    grouped.deadlift.push(
      bestDeadlift
        ? {
            weightClass,
            weight: bestDeadlift.bestDeadlift,
            athlete: athletes.find((a) => a.vpfId === bestDeadlift.vpfId),
            meet: meets.find((m) => m.meetId === bestDeadlift.meetId),
            bodyWeight: bestDeadlift.bodyWeight,
            vpfId: bestDeadlift.vpfId,
            meetId: bestDeadlift.meetId,
          }
        : { weightClass, weight: null }
    )

    // Total
    const totalResults = weightClassResults
      .filter((r) => r.total && r.total > 0)
      .sort((a, b) => (b.total || 0) - (a.total || 0))
    const bestTotal = totalResults[0]
    grouped.total.push(
      bestTotal
        ? {
            weightClass,
            weight: bestTotal.total,
            athlete: athletes.find((a) => a.vpfId === bestTotal.vpfId),
            meet: meets.find((m) => m.meetId === bestTotal.meetId),
            bodyWeight: bestTotal.bodyWeight,
            vpfId: bestTotal.vpfId,
            meetId: bestTotal.meetId,
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


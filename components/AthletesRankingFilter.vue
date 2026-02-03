<template>
  <div class="flex flex-wrap gap-4 items-end p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
    <div class="flex-1 min-w-[200px]">
      <label class="block text-sm font-medium mb-2 text">Search Athlete</label>
      <InputText
        :model-value="search"
        placeholder="Search by name or VPF ID..."
        class="w-full"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="min-w-[180px]">
      <label class="block text-sm font-medium mb-2 text">Sort By</label>
      <Select
        :model-value="sort"
        :options="sortOptions"
        option-label="label"
        option-value="value"
        placeholder="Sort by..."
        class="w-full"
        @update:model-value="$emit('update:sort', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text">Competition Type</label>
      <Select
        :model-value="meetType"
        :options="meetTypeOptions"
        option-label="label"
        option-value="value"
        placeholder="All"
        class="w-full"
        @update:model-value="$emit('update:meetType', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text">Sport Gender</label>
      <Select
        :model-value="sex"
        :options="sexOptions"
        option-label="label"
        option-value="value"
        placeholder="All"
        class="w-full"
        @update:model-value="$emit('update:sex', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text">Division</label>
      <Select
        :model-value="division"
        :options="divisionOptions"
        option-label="label"
        option-value="value"
        placeholder="All"
        class="w-full"
        @update:model-value="$emit('update:division', $event)"
      />
    </div>

    <div class="min-w-[180px]">
      <label class="block text-sm font-medium mb-2 text">Weight Class</label>
      <Select
        :model-value="weightClass"
        :options="weightClassOptions"
        option-label="label"
        option-value="value"
        :compare-with="compareWeightClass"
        placeholder="All"
        class="w-full"
        @update:model-value="$emit('update:weightClass', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from "@/components/volt/InputText.vue"
import Select from "@/components/volt/Select.vue"
import type { Sex, Division, MeetType } from "~/types/union-types"

interface Props {
  search: string
  sort: string
  sex: Sex | null
  division: Division | null
  weightClass: { weight: number | null; sex: Sex | null } | null
  meetType: MeetType | null
}

defineProps<Props>()

defineEmits<{
  "update:search": [value: string]
  "update:sort": [value: string]
  "update:sex": [value: Sex | null]
  "update:division": [value: Division | null]
  "update:weightClass": [value: { weight: number | null; sex: Sex | null } | null]
  "update:meetType": [value: MeetType | null]
}>()

const sortOptions = [
  { label: "GL Point", value: "gl" },
  { label: "Squat", value: "bestSquat" },
  { label: "Bench", value: "bestBench" },
  { label: "Deadlift", value: "bestDeadlift" },
  { label: "Total", value: "total" }
]

const meetTypeOptions = [
  { label: "All", value: null },
  { label: "National Championship", value: "national" },
  { label: "National Qualifier", value: "national_qualifier" },
  { label: "Amateur", value: "amateur" }
]

const sexOptions = [
  { label: "All", value: null },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" }
]

const divisionOptions = [
  { label: "All", value: null },
  { label: "Open", value: "open" },
  { label: "Junior", value: "jr" },
  { label: "Sub-Junior", value: "subjr" },
  { label: "Master I", value: "mas1" },
  { label: "Master II", value: "mas2" },
  { label: "Master III", value: "mas3" },
  { label: "Master IV", value: "mas4" }
]

const weightClassOptions = [
  { label: "All", value: null },
  { label: "Male 59kg", value: { weight: 59, sex: "male" } },
  { label: "Male 66kg", value: { weight: 66, sex: "male" } },
  { label: "Male 74kg", value: { weight: 74, sex: "male" } },
  { label: "Male 83kg", value: { weight: 83, sex: "male" } },
  { label: "Male 93kg", value: { weight: 93, sex: "male" } },
  { label: "Male 105kg", value: { weight: 105, sex: "male" } },
  { label: "Male 120kg", value: { weight: 120, sex: "male" } },
  { label: "Male 120+kg", value: { weight: 999, sex: "male" } },
  { label: "Female 47kg", value: { weight: 47, sex: "female" } },
  { label: "Female 52kg", value: { weight: 52, sex: "female" } },
  { label: "Female 57kg", value: { weight: 57, sex: "female" } },
  { label: "Female 63kg", value: { weight: 63, sex: "female" } },
  { label: "Female 69kg", value: { weight: 69, sex: "female" } },
  { label: "Female 76kg", value: { weight: 76, sex: "female" } },
  { label: "Female 84kg", value: { weight: 84, sex: "female" } },
  { label: "Female 84+kg", value: { weight: 999, sex: "female" } }
]

// Compare function for weight class objects
const compareWeightClass = (a: { weight: number | null; sex: Sex | null } | null, b: { weight: number | null; sex: Sex | null } | null): boolean => {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.weight === b.weight && a.sex === b.sex
}
</script>
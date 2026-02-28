<template>
  <div class="flex flex-wrap gap-4 items-end p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
    <div class="flex-1 min-w-[200px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("ranking.searchAthlete") }}</label>
      <InputText
        :model-value="search"
        :placeholder="$t('ranking.searchPlaceholder')"
        class="w-full"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="min-w-[180px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("ranking.sortBy") }}</label>
      <Select
        :model-value="sort"
        :options="sortOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('ranking.sortPlaceholder')"
        class="w-full"
        @update:model-value="$emit('update:sort', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("ranking.competitionType") }}</label>
      <Select
        :model-value="meetType"
        :options="meetTypeOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('ranking.filterAll')"
        class="w-full"
        @update:model-value="$emit('update:meetType', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("general.sportGender") }}</label>
      <Select
        :model-value="sex"
        :options="sexOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('ranking.filterAll')"
        class="w-full"
        @update:model-value="$emit('update:sex', $event)"
      />
    </div>

    <div class="min-w-[150px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("general.division") }}</label>
      <Select
        :model-value="division"
        :options="divisionOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('ranking.filterAll')"
        class="w-full"
        @update:model-value="$emit('update:division', $event)"
      />
    </div>

    <div class="min-w-[180px]">
      <label class="block text-sm font-medium mb-2 text-surface-700">{{ $t("general.weightClass") }}</label>
      <Select
        :model-value="weightClass"
        :options="weightClassOptions"
        option-label="label"
        option-value="value"
        :compare-with="compareWeightClass"
        :placeholder="$t('ranking.filterAll')"
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

const { t } = useI18n()

const sortOptions = computed(() => [
  { label: t("ranking.sortGlPoint"), value: "gl" },
  { label: t("general.squat"), value: "bestSquat" },
  { label: t("general.bench"), value: "bestBench" },
  { label: t("general.deadlift"), value: "bestDeadlift" },
  { label: t("general.total"), value: "total" }
])

const meetTypeOptions = computed(() => [
  { label: t("ranking.filterAll"), value: null },
  { label: t("general.meetTypeNational"), value: "national" },
  { label: t("general.meetTypeNationalQualifier"), value: "national_qualifier" },
  { label: t("general.meetTypeAmateur"), value: "amateur" }
])

const sexOptions = computed(() => [
  { label: t("ranking.filterAll"), value: null },
  { label: t("general.male"), value: "male" },
  { label: t("general.female"), value: "female" }
])

const divisionOptions = computed(() => [
  { label: t("ranking.filterAll"), value: null },
  { label: t("general.divisionOpen"), value: "open" },
  { label: t("general.divisionJunior"), value: "jr" },
  { label: t("general.divisionSubJunior"), value: "subjr" },
  { label: t("general.divisionMaster1"), value: "mas1" },
  { label: t("general.divisionMaster2"), value: "mas2" },
  { label: t("general.divisionMaster3"), value: "mas3" },
  { label: t("general.divisionMaster4"), value: "mas4" }
])

const weightClassOptions = computed(() => [
  { label: t("ranking.filterAll"), value: null },
  { label: `${t("general.male")} 59kg`, value: { weight: 59, sex: "male" } },
  { label: `${t("general.male")} 66kg`, value: { weight: 66, sex: "male" } },
  { label: `${t("general.male")} 74kg`, value: { weight: 74, sex: "male" } },
  { label: `${t("general.male")} 83kg`, value: { weight: 83, sex: "male" } },
  { label: `${t("general.male")} 93kg`, value: { weight: 93, sex: "male" } },
  { label: `${t("general.male")} 105kg`, value: { weight: 105, sex: "male" } },
  { label: `${t("general.male")} 120kg`, value: { weight: 120, sex: "male" } },
  { label: `${t("general.male")} 120+kg`, value: { weight: 999, sex: "male" } },
  { label: `${t("general.female")} 47kg`, value: { weight: 47, sex: "female" } },
  { label: `${t("general.female")} 52kg`, value: { weight: 52, sex: "female" } },
  { label: `${t("general.female")} 57kg`, value: { weight: 57, sex: "female" } },
  { label: `${t("general.female")} 63kg`, value: { weight: 63, sex: "female" } },
  { label: `${t("general.female")} 69kg`, value: { weight: 69, sex: "female" } },
  { label: `${t("general.female")} 76kg`, value: { weight: 76, sex: "female" } },
  { label: `${t("general.female")} 84kg`, value: { weight: 84, sex: "female" } },
  { label: `${t("general.female")} 84+kg`, value: { weight: 999, sex: "female" } }
])

// Compare function for weight class objects
const compareWeightClass = (a: { weight: number | null; sex: Sex | null } | null, b: { weight: number | null; sex: Sex | null } | null): boolean => {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.weight === b.weight && a.sex === b.sex
}
</script>
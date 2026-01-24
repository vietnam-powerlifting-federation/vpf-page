<template>
  <div class="space-y-8">
    <!-- Group by lift type -->
    <div v-for="liftType in liftTypes" :key="liftType">
      <div v-if="getRecordsByLift(liftType).length > 0">
        <h2 class="text-2xl font-bold mb-4 text-primary">{{ getLiftName(liftType) }}</h2>
        
        <!-- Group by weight class and division -->
        <div v-for="group in getGroupedRecords(liftType)" :key="group.key" class="mb-6">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h3 class="text-lg font-semibold mb-2">
              {{ formatWeightClass(group.weightClass) }} - {{ formatDivision(group.division) }} 
              ({{ group.sex === 'male' ? 'Male' : 'Female' }})
            </h3>
            
            <!-- Show previous record if available -->
            <div v-if="group.previousRecord" class="text-sm text-gray-600 dark:text-gray-400 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span class="font-medium">{{ t("records.previousRecord") }}:</span> 
              <span class="ml-2">{{ formatWeight(group.previousRecord) }}kg</span>
            </div>
            
            <!-- List of records broken -->
            <div class="space-y-2">
              <div
                v-for="(record, index) in group.records"
                :key="`${record.vpfId}-${record.lot}-${record.attempt || 0}`"
                class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:border-primary transition-colors"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[2rem]">
                      #{{ index + 1 }}
                    </span>
                    <NuxtLink
                      v-if="record.athlete"
                      :to="`/athletes/${record.athlete.vpfId}`"
                      class="font-semibold text-primary hover:underline"
                    >
                      {{ record.athlete.fullName }}
                    </NuxtLink>
                    <span v-else class="font-semibold">{{ record.vpfId }}</span>
                  </div>
                  <div class="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400 ml-11">
                    <span v-if="record.attempt">
                      {{ t("records.attempt") }} {{ record.attempt }}
                    </span>
                    <span v-if="record.bodyWeight">
                      {{ t("records.bodyWeight") }}: {{ formatWeight(record.bodyWeight) }}kg
                    </span>
                    <span v-if="record.lot" class="text-xs">
                      Lot {{ record.lot }}
                    </span>
                  </div>
                </div>
                <div class="text-right ml-4">
                  <div class="text-xl font-bold text-primary">
                    {{ formatWeight(record.recordWeight) }}kg
                  </div>
                  <div v-if="getImprovement(record, group, index)" class="text-sm text-green-600 dark:text-green-400 font-medium">
                    +{{ formatWeight(getImprovement(record, group, index)!) }}kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { LiftRecord } from "~/types/records"
import type { UserPublic } from "~/types/users"
import type { Sex, Division } from "~/types/union-types"

const { t } = useI18n()

interface Props {
  records: LiftRecord[]
  athletes: UserPublic[]
  previousRecordsMap?: Map<string, number>
}

const props = withDefaults(defineProps<Props>(), {
  previousRecordsMap: () => new Map<string, number>()
})

const liftTypes = ["squat", "bench", "deadlift", "total"] as const

// Create athletes map
const athletesMap = computed(() => {
  const map = new Map<string, UserPublic>()
  props.athletes.forEach(a => map.set(a.vpfId, a))
  return map
})

// Get records by lift type
const getRecordsByLift = (lift: typeof liftTypes[number]): LiftRecord[] => {
  return props.records
    .filter(r => r.lift === lift)
    .map(r => ({
      ...r,
      athlete: athletesMap.value.get(r.vpfId)
    }))
}

// Group records by weight class, division, and sex
interface GroupedRecord {
  key: string
  weightClass: number
  division: Division
  sex: Sex
  records: (LiftRecord & { athlete?: UserPublic })[]
  previousRecord: number | null
}

const getGroupedRecords = (lift: typeof liftTypes[number]): GroupedRecord[] => {
  const records = getRecordsByLift(lift)
  
  // Group by weight class, division, and sex
  const groups = new Map<string, GroupedRecord>()
  
  for (const record of records) {
    const key = `${record.sex}-${record.recordDivision}-${record.weightClass}`
    
    if (!groups.has(key)) {
      // Get previous record from map
      const previousRecordKey = `${record.sex}-${record.recordDivision}-${record.weightClass}-${record.lift}`
      const previousRecord = props.previousRecordsMap?.get(previousRecordKey) ?? null
      
      groups.set(key, {
        key,
        weightClass: record.weightClass,
        division: record.recordDivision,
        sex: record.sex,
        records: [],
        previousRecord
      })
    }
    
    const group = groups.get(key)!
    
    group.records.push({
      ...record,
      athlete: athletesMap.value.get(record.vpfId)
    })
  }
  
  // Sort records within each group by lot, then by attempt
  const groupsArray = Array.from(groups.values())
  for (const group of groupsArray) {
    group.records.sort((a, b) => {
      return a.recordWeight - b.recordWeight
    })
    
    // Previous record is already set from the map
  }
  
  return groupsArray
}

const getLiftName = (lift: typeof liftTypes[number]): string => {
  const names = {
    squat: "Squat",
    bench: "Bench Press",
    deadlift: "Deadlift",
    total: "Total"
  }
  return names[lift]
}

const formatWeightClass = (weightClass: number | null | undefined): string => {
  if (!weightClass) return "-"
  if (weightClass === 999) return "120+kg"
  return `${weightClass}kg`
}

const formatDivision = (division: Division): string => {
  const names: Record<Division, string> = {
    subjr: "Sub-Junior",
    jr: "Junior",
    open: "Open",
    mas1: "Masters 1",
    mas2: "Masters 2",
    mas3: "Masters 3",
    mas4: "Masters 4",
    guest: "Guest"
  }
  return names[division] || division
}

const formatWeight = (weight: number | null | undefined): string => {
  if (weight === null || weight === undefined) return "-"
  return weight.toFixed(2)
}

// Calculate improvement over previous record
const getImprovement = (
  record: LiftRecord & { athlete?: UserPublic },
  group: GroupedRecord,
  index: number
): number | null => {
  // If this is the first record and we have a previous record
  if (index === 0 && group.previousRecord) {
    return record.recordWeight - group.previousRecord
  }
  
  // If this is not the first record, compare with the previous record in the list
  if (index > 0) {
    const previousRecord = group.records[index - 1]
    if (record.recordWeight > previousRecord.recordWeight) {
      return record.recordWeight - previousRecord.recordWeight
    }
  }
  
  return null
}
</script>

<template>
  <div class="space-y-8">
    <!-- Group by lift type -->
    <div v-for="liftType in liftTypes" :key="liftType">
      <div v-if="getRecordsByLift(liftType).length > 0">
        <h2 class="text-2xl font-bold mb-4 text-primary">{{ getLiftName(liftType) }}</h2>

        <!-- Group by weight class and division -->
        <div v-for="group in getGroupedRecords(liftType)" :key="group.key" class="mb-6">
          <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 mb-4">
            <h3 class="text-lg font-semibold mb-2">
              {{ formatWeightClass(group.weightClass, group.sex) }} - {{ formatDivision(group.division) }}
              ({{ group.sex === 'male' ? t("general.male") : t("general.female") }})
            </h3>

            <!-- Show previous record if available -->
            <div v-if="group.previousRecord" class="text-sm text-surface-600 dark:text-surface-400 mb-3 pb-2 border-b border-surface-200 dark:border-surface-700">
              <span class="font-medium">{{ t("records.previousRecord") }}:</span>
              <span class="ml-2">{{ formatWeight(group.previousRecord) }}kg</span>
            </div>

            <!-- List of records broken -->
            <div class="space-y-2">
              <div
                v-for="(record, index) in group.records"
                :key="`${record.resultId}-${record.attempt}`"
                class="flex items-center justify-between p-3 bg-surface-0 dark:bg-surface-900 rounded border border-surface-200 dark:border-surface-700 hover:border-primary transition-colors"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-medium text-surface-500 dark:text-surface-400 min-w-[2rem]">
                      #{{ index + 1 }}
                    </span>
                    <NuxtLink
                      v-if="record.athlete"
                      :to="`/openvpf/athletes/${record.athlete.vpfId}`"
                      class="font-semibold text-primary hover:underline"
                    >
                      {{ record.athlete.fullName }}
                    </NuxtLink>
                    <span v-else class="font-semibold">{{ record.result?.vpfId }}</span>
                  </div>
                  <div class="flex items-center gap-4 mt-1 text-sm text-surface-600 dark:text-surface-400 ml-11">
                    <span>
                      {{ t("general.attempt") }} {{ record.attempt }}
                    </span>
                    <span v-if="record.result?.bodyWeight">
                      {{ t("general.bodyWeight") }}: {{ formatWeight(record.result.bodyWeight) }}kg
                    </span>
                    <span v-if="record.result?.lot" class="text-xs">
                      {{ t("recordsHistory.lot") }} {{ record.result.lot }}
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
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"
import type { Sex, Division } from "~/types/union-types"
import { formatWeightClass } from "@/lib/utils/client"

const { t } = useI18n()

interface Props {
  records: LiftRecord[]
  athletes: UserPublic[]
  results: Result[]
  previousRecordsMap?: Map<string, number>
}

const props = withDefaults(defineProps<Props>(), {
  previousRecordsMap: () => new Map<string, number>()
})

const liftTypes = ["squat", "bench", "deadlift", "total"] as const

const athletesMap = computed(() => {
  const map = new Map<string, UserPublic>()
  props.athletes.forEach(a => map.set(a.vpfId, a))
  return map
})

const resultsById = computed(() => {
  const map = new Map<string, Result>()
  props.results.forEach(r => map.set(r.resultId, r))
  return map
})

type RichRecord = LiftRecord & { athlete?: UserPublic; result?: Result }

const getRecordsByLift = (lift: typeof liftTypes[number]): RichRecord[] => {
  return props.records
    .filter(r => r.lift === lift)
    .map(r => {
      const result = resultsById.value.get(r.resultId)
      return {
        ...r,
        result,
        athlete: result ? athletesMap.value.get(result.vpfId) : undefined,
      }
    })
}

interface GroupedRecord {
  key: string
  weightClass: number
  division: Division
  sex: Sex
  records: RichRecord[]
  previousRecord: number | null
}

const getGroupedRecords = (lift: typeof liftTypes[number]): GroupedRecord[] => {
  const records = getRecordsByLift(lift)
  const groups = new Map<string, GroupedRecord>()

  for (const record of records) {
    const result = record.result
    if (!result) continue

    const key = `${result.sex}-${record.recordDivision}-${result.weightClass}`

    if (!groups.has(key)) {
      const previousRecordKey = `${result.sex}-${record.recordDivision}-${result.weightClass}-${record.lift}`
      const previousRecord = props.previousRecordsMap?.get(previousRecordKey) ?? null

      groups.set(key, {
        key,
        weightClass: result.weightClass,
        division: record.recordDivision,
        sex: result.sex,
        records: [],
        previousRecord,
      })
    }

    groups.get(key)!.records.push(record)
  }

  const groupsArray = Array.from(groups.values())
  for (const group of groupsArray) {
    group.records.sort((a, b) => a.recordWeight - b.recordWeight)
  }

  return groupsArray
}

const getLiftName = (lift: typeof liftTypes[number]): string => {
  const keyMap = {
    squat: "general.squat",
    bench: "general.benchPress",
    deadlift: "general.deadlift",
    total: "general.total"
  }
  return t(keyMap[lift])
}

const formatDivision = (division: Division): string => {
  const keyMap: Record<Division, string> = {
    subjr: "general.divisionSubJunior",
    jr: "general.divisionJunior",
    open: "general.divisionOpen",
    mas1: "general.divisionMaster1",
    mas2: "general.divisionMaster2",
    mas3: "general.divisionMaster3",
    mas4: "general.divisionMaster4",
    guest: "general.divisionGuest"
  }
  return t(keyMap[division] || "general.divisionOpen")
}

const formatWeight = (weight: number | null | undefined): string => {
  if (weight === null || weight === undefined) return "-"
  return weight.toFixed(2)
}

const getImprovement = (
  record: RichRecord,
  group: GroupedRecord,
  index: number
): number | null => {
  if (index === 0 && group.previousRecord) {
    return record.recordWeight - group.previousRecord
  }
  if (index > 0) {
    const previousRecord = group.records[index - 1]
    if (record.recordWeight > previousRecord.recordWeight) {
      return record.recordWeight - previousRecord.recordWeight
    }
  }
  return null
}
</script>

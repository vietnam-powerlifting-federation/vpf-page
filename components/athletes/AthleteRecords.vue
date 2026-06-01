<template>
  <div>
    <h2 class="text-2xl font-bold mb-4 text-primary">{{ $t("athlete.liftersRecords") }}</h2>
    <DataTable :value="enrichedRecords" striped-rows show-gridlines>
      <template #empty>
        <div class="px-4 py-6 text-center text-surface-400">-</div>
      </template>
      <Column :header="$t('athlete.competition')">
        <template #body="{ data }">
          {{ data.meetName }}
        </template>
      </Column>
      <Column :header="$t('athlete.record')">
        <template #body="{ data }">
          <span class="font-medium text-primary">{{ liftLabel(data.record.lift) }}</span>
        </template>
      </Column>
      <Column :header="$t('general.total')" style="text-align: right">
        <template #body="{ data }">
          <span class="font-medium text-primary">{{ formatWeight(data.record.recordWeight) }}</span>
        </template>
      </Column>
      <Column :header="$t('general.weightClass')">
        <template #body="{ data }">
          {{ data.result ? formatWeightClass(data.result.weightClass, data.result.sex) : "-" }}
        </template>
      </Column>
      <Column :header="$t('general.division')">
        <template #body="{ data }">
          {{ formatDivision(data.record.recordDivision) }}
        </template>
      </Column>
      <Column :header="$t('general.date')">
        <template #body="{ data }">
          {{ data.hostDate }}
        </template>
      </Column>
      <Column :header="$t('athlete.state')">
        <template #body="{ data }">
          <span :class="data.record.status === 'holding' ? 'text-teal-400' : 'text-orange-400'" class="font-medium">
            {{ data.record.status === "holding" ? $t("athlete.holding") : $t("athlete.broken") }}
          </span>
        </template>
      </Column>
      <Column v-if="showCertificate" :header="$t('athlete.recordCertificate')">
        <template #body="{ data }">
          <Button size="small" :label="$t('athlete.view')" @click="openCertificate(data)" />
        </template>
      </Column>
    </DataTable>

    <RecordCertificateDialog
      v-if="selectedCert"
      v-model:visible="dialogVisible"
      :cert="selectedCert"
      :can-attach="canAttach"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import Button from "primevue/button"
import { formatWeightClass, formatDivision, formatWeight } from "~/lib/utils/client"
import RecordCertificateDialog, { type CertificateData } from "~/components/athletes/RecordCertificateDialog.vue"
import type { LiftRecord } from "~/types/records"
import type { Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"

const props = defineProps<{
  records: LiftRecord[]
  compHistory: Result[]
  meets: MeetPublic[]
  athlete: UserPublic
  showCertificate?: boolean
  canAttach?: boolean
}>()

function liftLabel(lift: LiftRecord["lift"]): string {
  const map: Record<LiftRecord["lift"], string> = {
    squat: "Squat",
    bench: "Bench Press",
    deadlift: "Deadlift",
    total: "Total",
  }
  return map[lift]
}

function formatDate(date: string | null | undefined): string {
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

const enrichedRecords = computed(() => {
  const resultsById = new Map<string, Result>()
  for (const r of props.compHistory) {
    if (r.resultId) resultsById.set(r.resultId, r)
    if (r.legacyResultId) resultsById.set(r.legacyResultId, r)
  }
  const meetsById = new Map(props.meets.map((m) => [m.meetId, m]))

  return props.records.map((record) => {
    const result = resultsById.get(record.resultId)
    const meet = result ? meetsById.get(result.meetId) : undefined
    return {
      record,
      result,
      meetName: meet?.meetName ?? "-",
      hostDate: formatDate(meet?.hostDate),
      hostDateRaw: meet?.hostDate ?? null,
    }
  })
})

type EnrichedRecord = (typeof enrichedRecords.value)[number]

const dialogVisible = ref(false)
const selectedCert = ref<CertificateData | null>(null)

function openCertificate(row: EnrichedRecord) {
  selectedCert.value = {
    fullName: props.athlete.fullName,
    liftLabel: liftLabel(row.record.lift),
    weight: row.record.recordWeight,
    sex: row.result?.sex ?? null,
    division: row.record.recordDivision,
    weightClass: row.result?.weightClass ?? null,
    meetName: row.meetName,
    hostDate: row.hostDateRaw,
  }
  dialogVisible.value = true
}
</script>

<template>
  <section :aria-labelledby="titleId" class="grid gap-3">
    <h2 :id="titleId" class="font-display text-2xl font-bold uppercase">{{ $t("athlete.recordsTitle") }}</h2>
    <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
      <ResultsTable :columns="columns" :rows="rows" :caption="$t('athlete.recordsCaption', { name: athlete.fullName })" :row-key="(row, i) => `${row.record.resultId}-${row.record.lift}-${row.record.recordDivision}-${i}`">
        <template #cell-lift="{ row }">
          <span class="font-semibold">{{ liftLabel(row.record.lift) }}</span>
          <span class="block text-[0.8125rem] text-muted-color">
            {{ row.result ? formatWeightClass(row.result.weightClass, row.result.sex) : "–" }} · {{ $t(DIVISION_LABEL_KEY[row.record.recordDivision]) }}
          </span>
        </template>
        <template #cell-weight="{ row }">
          <span class="text-xl font-bold">{{ formatKg(row.record.recordWeight, locale) }}</span>
        </template>
        <template #cell-competition="{ row }">
          <span class="block min-w-48 whitespace-normal">
            <NuxtLinkLocale v-if="row.meet" :to="`/competitions/${row.meet.meetSlug}`" class="decoration-accent decoration-2 underline-offset-3 hover:underline">{{ row.meet.meetName }}</NuxtLinkLocale>
            <span class="block text-[0.8125rem] text-muted-color">{{ formatDate(row.meet?.hostDate, locale) }}</span>
          </span>
        </template>
        <template #cell-status="{ row }">
          <Tag :severity="row.record.status === 'holding' ? 'success' : 'secondary'" :value="row.record.status === 'holding' ? $t('athlete.holding') : $t('athlete.broken')" />
        </template>
        <template #cell-certificate="{ row }">
          <Button
            size="small"
            severity="secondary"
            variant="outlined"
            :aria-label="$t('athlete.certificateFor', { lift: liftLabel(row.record.lift), kg: formatKg(row.record.recordWeight, locale) })"
            @click="openCertificate(row)"
          >
            <AppIcon name="lucide:award" class="size-4" />
            {{ $t("athlete.view") }}
          </Button>
        </template>
      </ResultsTable>
    </div>

    <!-- The certificate (and its PDF libraries) loads only when someone opens one. -->
    <LazyRecordCertificateDialog v-if="selectedCert" v-model:visible="dialogVisible" :cert="selectedCert" :can-attach="canAttach" />
  </section>
</template>

<script setup lang="ts">
import { DIVISION_LABEL_KEY, formatDate, formatKg, formatWeightClass } from "~/lib/domain/format"
import type { CertificateData } from "~/types/certificate"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"
import type { Result } from "~/types/results"
import type { TableColumn } from "~/types/tables"
import type { UserPublic } from "~/types/users"

/** National records the athlete has set, whether they still stand, and a certificate for each. */
const props = defineProps<{
  records: LiftRecord[]
  compHistory: Result[]
  meets: MeetPublic[]
  athlete: UserPublic
  canAttach?: boolean
}>()

const { t, locale } = useI18n()
const titleId = useId()

function liftLabel(lift: LiftRecord["lift"]) {
  return t(lift === "bench" ? "general.benchPress" : `general.${lift}`)
}

const rows = computed(() => {
  const resultsById = new Map<string, Result>()
  for (const r of props.compHistory) {
    if (r.resultId) resultsById.set(r.resultId, r)
    if (r.legacyResultId) resultsById.set(r.legacyResultId, r)
  }
  const meetsById = new Map(props.meets.map((m) => [m.meetId, m]))
  return props.records.map((record) => {
    const result = resultsById.get(record.resultId)
    return { record, result, meet: result ? meetsById.get(result.meetId) : undefined }
  })
})

const columns = computed<TableColumn[]>(() => [
  { key: "lift", label: t("athlete.lift"), rowHeader: true },
  { key: "weight", label: t("ranking.withUnit", { label: t("athlete.record") }), numeric: true },
  { key: "competition", label: t("athlete.competition") },
  { key: "status", label: t("athlete.state") },
  { key: "certificate", label: t("athlete.recordCertificate") },
])

const dialogVisible = ref(false)
const selectedCert = ref<CertificateData | null>(null)

function openCertificate(row: (typeof rows.value)[number]) {
  selectedCert.value = {
    fullName: props.athlete.fullName,
    liftLabel: liftLabel(row.record.lift),
    weight: row.record.recordWeight,
    sex: row.result?.sex ?? null,
    division: row.record.recordDivision,
    weightClass: row.result?.weightClass ?? null,
    meetName: row.meet?.meetName ?? "–",
    hostDate: row.meet?.hostDate ?? null,
  }
  dialogVisible.value = true
}
</script>

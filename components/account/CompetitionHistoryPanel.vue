<template>
  <PagePanel :title="$t('profile.tabs.competitionInfo')" ruled flush>
    <LoadingState v-if="history.pending" />
    <p v-else-if="!history.rows.length" class="px-4 pb-6 text-muted-color md:px-6">{{ $t("profile.competitionInfoTable.noCompetitions") }}</p>
    <ResultsTable v-else :columns="columns" :rows="history.rows" :caption="$t('profile.tabs.competitionInfo')" :row-key="(row) => row.meetId">
      <template #cell-date="{ row }">
        <span class="tabular-nums">{{ formatDate(row.hostDate, locale) }}</span>
      </template>
      <template #cell-competition="{ row }">
        <NuxtLinkLocale :to="`/competitions/${row.meetSlug}`" class="font-semibold decoration-accent decoration-2 underline-offset-3 hover:underline">{{ row.meetName }}</NuxtLinkLocale>
      </template>
      <template #cell-status="{ row }">
        <Tag :severity="row.completed ? 'secondary' : 'info'" :value="row.completed ? $t('profile.competitionInfoTable.completed') : $t('profile.competitionInfoTable.registered')" />
      </template>
      <template #cell-action="{ row }">
        <span class="inline-flex items-center gap-2">
          <Button size="small" severity="secondary" variant="outlined" disabled :label="row.completed ? $t('profile.competitionInfoTable.viewDetail') : $t('profile.competitionInfoTable.change')" />
          <Tag severity="secondary" :value="$t('profile.demo')" />
        </span>
      </template>
      <template #cell-display="{ row }">
        <Checkbox v-if="row.completed" :model-value="row.displayOnProfile" binary disabled :aria-label="$t('profile.competitionInfoTable.displayOnProfile')" />
        <span v-else class="text-muted-color">–</span>
      </template>
    </ResultsTable>
  </PagePanel>
</template>

<script setup lang="ts">
import { formatDate } from "~/lib/domain/format"
import type { TableColumn } from "~/types/tables"

/** The athlete's own competitions: date, name, status, and whether the result shows on their profile. */
const history = useCompetitionHistory()
const { t, locale } = useI18n()

const columns = computed<TableColumn[]>(() => [
  { key: "date", label: t("profile.competitionInfoTable.date") },
  { key: "competition", label: t("profile.competitionInfoTable.competition"), rowHeader: true },
  { key: "status", label: t("profile.competitionInfoTable.status") },
  { key: "action", label: t("profile.competitionInfoTable.action") },
  { key: "display", label: t("profile.competitionInfoTable.displayOnProfile") },
])
</script>

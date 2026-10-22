<template>
  <PagePanel :title="$t('profile.tabs.competitionInfo')" ruled flush>
    <LoadingState v-if="pending" />
    <p v-else-if="!rows.length" class="px-4 pb-6 text-muted-color md:px-6">{{ $t("profile.competitionInfoTable.noCompetitions") }}</p>
    <ResultsTable v-else :columns="columns" :rows="rows" :caption="$t('profile.tabs.competitionInfo')" :row-key="(row) => row.meetId">
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
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"

definePageMeta({
  layout: "account",
  middleware: "auth",
})

// The competition history is the aggregate shape, not the session record, so it
// comes from the profile endpoint rather than from `useProfileAthlete`.
const { data: athleteResponse, pending } = useProfileCompetitions()

const rows = computed(() => {
  const data = athleteResponse.value
  if (!data?.meets?.length) return []
  const today = new Date().toISOString().slice(0, 10)
  const resultByMeet = new Map<number, Result>()
  for (const r of data.compHistory || []) {
    resultByMeet.set(r.meetId, r)
  }
  return data.meets.map((meet: MeetPublic) => {
    const completed = meet.hostDate ? today > meet.hostDate : false
    const result = resultByMeet.get(meet.meetId)
    const displayOnProfile = !!(result && "showOnProfile" in result && result.showOnProfile)
    return {
      meetId: meet.meetId,
      meetName: meet.meetName,
      meetSlug: meet.meetSlug,
      hostDate: meet.hostDate,
      completed,
      displayOnProfile,
    }
  })
})

const { t, locale } = useI18n()

const columns = computed<TableColumn[]>(() => [
  { key: "date", label: t("profile.competitionInfoTable.date") },
  { key: "competition", label: t("profile.competitionInfoTable.competition"), rowHeader: true },
  { key: "status", label: t("profile.competitionInfoTable.status") },
  { key: "action", label: t("profile.competitionInfoTable.action") },
  { key: "display", label: t("profile.competitionInfoTable.displayOnProfile") },
])

useHead({ title: () => t("profile.tabs.competitionInfo") })
</script>

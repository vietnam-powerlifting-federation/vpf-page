<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.competitionInfo") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="!rows.length" class="text-surface-400">
      {{ $t("profile.competitionInfoTable.noCompetitions") }}
    </div>
    <div v-else>
      <DataTable :value="rows" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
        <Column field="hostDate" :header="$t('profile.competitionInfoTable.date')">
          <template #body="{ data }">
            {{ formatDateDMY(data.hostDate) }}
          </template>
        </Column>
        <Column field="meetName" :header="$t('profile.competitionInfoTable.competition')">
          <template #body="{ data }">
            <NuxtLinkLocale :to="`/openvpf/competitions/${data.meetSlug}`" class="hover:underline">
              {{ data.meetName }}
            </NuxtLinkLocale>
          </template>
        </Column>
        <Column :header="$t('profile.competitionInfoTable.status')">
          <template #body="{ data }">
            <span :class="data.completed ? 'text-surface-400' : 'text-primary'">
              {{ data.completed ? $t("profile.competitionInfoTable.completed") : $t("profile.competitionInfoTable.registered") }}
            </span>
          </template>
        </Column>
        <Column :header="$t('profile.competitionInfoTable.action')">
          <template #body="{ data }">
            <template v-if="data.completed">
              <Button size="small" :label="$t('profile.competitionInfoTable.viewDetail')" class="mr-2" @click="() => {}" />
              <span class="text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
            </template>
            <template v-else>
              <Button size="small" :label="$t('profile.competitionInfoTable.change')" class="mr-2" @click="() => {}" />
              <span class="text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
            </template>
          </template>
        </Column>
        <Column :header="$t('profile.competitionInfoTable.displayOnProfile')">
          <template #body="{ data }">
            <template v-if="data.completed">
              <Checkbox :model-value="data.displayOnProfile" :binary="true" disabled />
              <span class="ml-2 text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
            </template>
            <span v-else class="text-surface-600">—</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useProfileAthlete } from "~/composables/useProfileData"
import { formatDateDMY } from "~/lib/utils/date"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { data: athleteResponse, pending } = useProfileAthlete()

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

const { t } = useI18n()

useHead({ title: () => t("profile.tabs.competitionInfo") })
</script>

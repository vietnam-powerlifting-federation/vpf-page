<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.competitionInfo") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="!rows.length" class="text-surface-400">
      {{ $t("profile.competitionInfoTable.noCompetitions") }}
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border border-surface-700 rounded-lg overflow-hidden">
        <thead class="bg-surface-800 text-surface-300 text-left text-sm">
          <tr>
            <th class="p-3 font-medium">{{ $t("profile.competitionInfoTable.date") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.competitionInfoTable.competition") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.competitionInfoTable.status") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.competitionInfoTable.action") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.competitionInfoTable.displayOnProfile") }}</th>
          </tr>
        </thead>
        <tbody class="text-surface-200">
          <tr v-for="row in rows" :key="row.meetId" class="border-t border-surface-700 hover:bg-surface-800/50">
            <td class="p-3">{{ formatDate(row.hostDate) }}</td>
            <td class="p-3">
              <NuxtLinkLocale :to="`/openvpf/competitions/${row.meetSlug}`" class="text-primary hover:underline">
                {{ row.meetName }}
              </NuxtLinkLocale>
            </td>
            <td class="p-3" :class="row.completed ? 'text-surface-400' : 'text-primary'">
              {{ row.completed ? $t("profile.competitionInfoTable.completed") : $t("profile.competitionInfoTable.registered") }}
            </td>
            <td class="p-3">
              <template v-if="row.completed">
                <Button
                  size="small"
                  :label="$t('profile.competitionInfoTable.viewDetail')"
                  class="mr-2"
                  @click="() => {}"
                />
                <span class="text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
              </template>
              <template v-else>
                <Button
                  size="small"
                  :label="$t('profile.competitionInfoTable.change')"
                  class="mr-2"
                  @click="() => {}"
                />
                <span class="text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
              </template>
            </td>
            <td class="p-3">
              <template v-if="row.completed">
                <Checkbox :model-value="row.displayOnProfile" :binary="true" disabled />
                <span class="ml-2 text-surface-500 text-sm">({{ $t("profile.demo") }})</span>
              </template>
              <span v-else class="text-surface-600">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Button from "@/components/volt/Button.vue"
import Checkbox from "@/components/volt/Checkbox.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import { useProfileAthlete } from "~/composables/useProfileData"
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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const { t } = useI18n()

useHead({ title: () => t("profile.tabs.competitionInfo") })
</script>

<template>
  <MeetTabContent :pending="pending" :error="error" :meet="meet ?? null">
    <ClientOnly>
    <div class="overflow-hidden">
        <DataTable
          :value="glRankedResults"
          :loading="false"
          :paginator="true"
          :rows="50"
          :rows-per-page-options="[25, 50, 100]"
          :sort-field="'gl'"
          :sort-order="-1"
          striped-rows          class="w-full border border-surface-200 dark:border-surface-700"
        >
          <Column field="rank" header="#" :sortable="false" style="width: 5rem" align="right">
            <template #body="{ data }">
              {{ data.rank }}
            </template>
          </Column>
          <Column field="athleteName" :header="$t('general.name')" :sortable="false" style="min-width: 200px" frozen>
            <template #body="{ data }">
              <NuxtLinkLocale
                v-if="data.athlete"
                :to="`/openvpf/athletes/${data.athlete.slug || data.athlete.vpfId}`"
                class="hover:underline"
                :style="nameGradientStyle(data.athlete.decorator1, data.athlete.decorator2)"
              >
                {{ data.athlete.fullName }}
              </NuxtLinkLocale>
              <span v-else class="text-surface-400">-</span>
            </template>
          </Column>
          <Column field="weightClass" :header="$t('general.weightClass')" :sortable="false" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeightClass(data.weightClass, data.sex) }}
            </template>
          </Column>
          <Column field="sex" :header="$t('meets.gender')" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatSex(data.sex) }}
            </template>
          </Column>
          <Column field="division" :header="$t('general.division')" :sortable="false" align="right" style="width: 10rem">
            <template #body="{ data }">
              {{ formatDivision(data.division) }}
            </template>
          </Column>
          <Column field="bestSquat" :header="$t('general.squat')" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestSquat) }}
            </template>
          </Column>
          <Column field="bestBench" :header="$t('general.bench')" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestBench) }}
            </template>
          </Column>
          <Column field="bestDeadlift" :header="$t('general.deadlift')" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.bestDeadlift) }}
            </template>
          </Column>
          <Column field="total" :header="$t('general.total')" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatWeight(data.total) }}
            </template>
          </Column>
          <Column field="gl" :header="$t('general.gl')" :sortable="true" align="right" style="width: 8rem">
            <template #body="{ data }">
              {{ formatGL(data.gl) }}
            </template>
          </Column>
        </DataTable>
    </div>
    </ClientOnly>
  </MeetTabContent>
</template>

<script setup lang="ts">
import MeetTabContent from "@/components/meets/MeetTabContent.vue"
import { DISQUALIFIED } from "~/lib/constants/constants"
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL, nameGradientStyle } from "@/lib/utils/client"

const route = useRoute()
const slug = route.params.slug as string

definePageMeta({
  layout: "openvpf-competitions",
  keepalive: true,
  pageTransition: false
})

const { meet, resultsWithAthletes, pending, error } = useMeetData(slug)

const glRankedResults = computed(() => {
  const ranked = [...resultsWithAthletes.value]
    .filter(r => r.gl !== null && r.placement !== DISQUALIFIED)
    .sort((a, b) => {
      const aGL = a.gl ?? 0
      const bGL = b.gl ?? 0
      return bGL - aGL
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }))
  return ranked
})

useSeoMeta({
  title: computed(() => meet.value ? `${meet.value.meetName} - GL Rankings - VPF` : "VPF Meet"),
  ogType: "website",
  ogTitle: computed(() => meet.value ? `${meet.value.meetName} - GL Rankings` : "VPF Meet"),
  ogDescription: computed(() => meet.value ? `View GL point rankings for ${meet.value.meetName}` : "View GL rankings"),
})
</script>

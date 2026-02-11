<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-lg font-semibold mb-2 text">Loading meet details...</div>
        <div class="text-sm text-gray-500">Please wait while we load the data</div>
      </div>
    </div>

    <div v-else-if="error || !meet" class="text-center py-12">
      <div class="text-lg font-semibold mb-2 text-red-500">Error loading meet</div>
      <div class="text-sm text-gray-500">{{ error || "Meet not found" }}</div>
    </div>

    <div v-else>
      <MeetHeader :meet="meet" :slug="slug" active-tab="gl-ranking" />

      <!-- GL Points Ranking Tab Content -->
      <div class="mt-6">
        <div class="overflow-hidden">
          <ClientOnly>
            <DataTable
              :value="glRankedResults"
              :loading="false"
              :paginator="true"
              :rows="50"
              :rows-per-page-options="[25, 50, 100]"
              :sort-field="'gl'"
              :sort-order="-1"
              striped-rows
              class="w-full"
              show-gridlines
            >
              <Column field="rank" header="#" :sortable="false" style="width: 5rem" align="right">
                <template #body="{ data }">
                  {{ data.rank }}
                </template>
              </Column>
              
              <Column field="athleteName" header="Name" :sortable="false" style="min-width: 200px" frozen>
                <template #body="{ data }">
                  <NuxtLink
                    v-if="data.athlete"
                    :to="`/athletes/${data.athlete.vpfId}`"
                    class="text-primary hover:underline"
                  >
                    {{ data.athlete.fullName }}
                  </NuxtLink>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </Column>
              
              <Column field="weightClass" header="Class" :sortable="false" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatWeightClass(data.weightClass, data.sex) }}
                </template>
              </Column>
              
              <Column field="sex" header="Gender" :sortable="false" align="right" style="width: 10rem">
                <template #body="{ data }">
                  {{ formatSex(data.sex) }}
                </template>
              </Column>
              
              <Column field="division" header="Division" :sortable="false" align="right" style="width: 10rem">
                <template #body="{ data }">
                  {{ formatDivision(data.division) }}
                </template>
              </Column>
              
              <Column field="bestSquat" header="Squat" :sortable="true" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatWeight(data.bestSquat) }}
                </template>
              </Column>
              
              <Column field="bestBench" header="Bench" :sortable="true" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatWeight(data.bestBench) }}
                </template>
              </Column>
              
              <Column field="bestDeadlift" header="Deadlift" :sortable="true" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatWeight(data.bestDeadlift) }}
                </template>
              </Column>
              
              <Column field="total" header="Total" :sortable="true" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatWeight(data.total) }}
                </template>
              </Column>
              
              <Column field="gl" header="GL" :sortable="true" align="right" style="width: 8rem">
                <template #body="{ data }">
                  {{ formatGL(data.gl) }}
                </template>
              </Column>
            </DataTable>
            <template #fallback>
              <div class="flex items-center justify-center py-12">
                <div class="text-center">
                  <div class="text-lg font-semibold mb-2 text">Loading GL rankings...</div>
                </div>
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import MeetHeader from "@/components/meets/MeetHeader.vue"
import { DISQUALIFIED } from "~/lib/constants/constants"
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL } from "@/lib/utils/client"

const route = useRoute()
const slug = route.params.slug as string

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in"
  }
})

const { meet, resultsWithAthletes, pending, error } = useMeetData(slug)

// GL ranked results
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
      rank: index + 1
    }))
  return ranked
})

useSeoMeta({
  title: computed(() => meet.value ? `${meet.value.meetName} - GL Rankings - VPF` : "VPF Meet"),
  ogType: "website",
  ogTitle: computed(() => meet.value ? `${meet.value.meetName} - GL Rankings` : "VPF Meet"),
  ogDescription: computed(() => meet.value ? `View GL point rankings for ${meet.value.meetName}` : "View GL rankings")
})
</script>


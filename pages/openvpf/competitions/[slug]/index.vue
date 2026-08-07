<template>
  <MeetTabContent :pending="pending" :error="error" :meet="meet ?? null">
    <Tabs :value="activeTab" @update:value="setActiveTab">
      <TabList
        unstyled
        class="flex relative bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700"
        :pt="{ content: { class: 'flex' }, tabList: { class: 'flex' } }"
      >
        <Tab v-slot="{ active, a11yAttrs, onClick }" value="scoresheet" as-child>
          <button type="button" v-bind="a11yAttrs" :class="tabClass(active)" @click="onClick">
            {{ $t("meets.scoresheet") }}
          </button>
        </Tab>
        <Tab v-slot="{ active, a11yAttrs, onClick }" value="detailed" as-child>
          <button type="button" v-bind="a11yAttrs" :class="tabClass(active)" @click="onClick">
            {{ $t("meets.detailedScoresheet") }}
          </button>
        </Tab>
        <Tab v-slot="{ active, a11yAttrs, onClick }" value="gl-ranking" as-child>
          <button type="button" v-bind="a11yAttrs" :class="tabClass(active)" @click="onClick">
            {{ $t("meets.athleteRankedByGlPoint") }}
          </button>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="scoresheet">
          <template v-if="visitedTabs.has('scoresheet')">
          <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
            <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
              <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
              <LazyMount :placeholder-height="`${divisionGroup.results.length * 44 + 56}px`">
              <div class="overflow-x-auto">
                  <DataTable
                    :value="divisionGroup.results"
                    :loading="false"
                    striped-rows
                    class="w-full border border-surface-200 dark:border-surface-700"
                    row-group-mode="subheader"
                    :pt="{ rowGroupHeaderCell: { colspan: 12 } }"
                    group-rows-by="weightClass"
                  >
                    <template #groupheader="slotProps">
                      -{{ formatWeightClass(slotProps.data.weightClass, slotProps.data.sex) }}
                    </template>
                    <Column field="placement" :header="$t('meets.place')" :sortable="true" style="width: 5rem" align="right">
                      <template #body="{ data }">
                        {{ formatPlacement(data.placement) }}
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
                    <Column field="squatPlacement" :header="$t('meets.squatPlace')" :sortable="true" align="right" style="width: 8rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.squatPlacement) }}
                      </template>
                    </Column>
                    <Column field="bestSquat" :header="$t('general.squat')" :sortable="true" align="right" style="width: 8rem">
                      <template #body="{ data }">
                        {{ formatWeight(data.bestSquat) }}
                      </template>
                    </Column>
                    <Column field="benchPlacement" :header="$t('meets.benchPlace')" :sortable="true" align="right" style="width: 8rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.benchPlacement) }}
                      </template>
                    </Column>
                    <Column field="bestBench" :header="$t('general.bench')" :sortable="true" align="right" style="width: 8rem">
                      <template #body="{ data }">
                        {{ formatWeight(data.bestBench) }}
                      </template>
                    </Column>
                    <Column field="deadliftPlacement" :header="$t('meets.deadliftPlace')" :sortable="true" align="right" style="width: 8rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.deadliftPlacement) }}
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
              </LazyMount>
            </div>
          </div>
          </template>
        </TabPanel>

        <TabPanel value="detailed">
          <template v-if="visitedTabs.has('detailed')">
          <div v-for="sexGroup in groupedByGenderDivision" :key="sexGroup.sex" class="mb-8">
            <div v-for="divisionGroup in sexGroup.divisions" :key="divisionGroup.division" class="mb-6">
              <h2 class="text-2xl font-bold mb-4">{{ formatSexAlternative(sexGroup.sex) }} {{ formatDivision(divisionGroup.division) }}</h2>
              <LazyMount :placeholder-height="`${divisionGroup.results.length * 44 + 56}px`">
              <div class="overflow-x-auto">
                  <DataTable
                    :value="divisionGroup.results"
                    :loading="false"
                    striped-rows
                    class="w-full border border-surface-200 dark:border-surface-700"
                    row-group-mode="subheader"
                    :pt="{ rowGroupHeaderCell: { colspan: 19 } }"
                    group-rows-by="weightClass"
                  >
                    <template #groupheader="slotProps">
                      -{{ formatWeightClass(slotProps.data.weightClass, slotProps.data.sex) }}
                    </template>
                    <Column field="placement" header="#" :sortable="true" style="width: 3rem" align="right">
                      <template #body="{ data }">
                        {{ formatPlacement(data.placement) }}
                      </template>
                    </Column>
                    <Column field="athleteName" :header="$t('general.name')" :sortable="false" style="min-width: 180px" frozen>
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
                    <Column field="bodyWeight" :header="$t('meets.bw')" :sortable="true" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        {{ formatWeight(data.bodyWeight) }}
                      </template>
                    </Column>
                    <Column header="SQ1" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.squat1)">{{ formatAttempt(data.squat1) }}</span>
                      </template>
                    </Column>
                    <Column header="SQ2" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.squat2)">{{ formatAttempt(data.squat2) }}</span>
                      </template>
                    </Column>
                    <Column header="SQ3" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.squat3)">{{ formatAttempt(data.squat3) }}</span>
                      </template>
                    </Column>
                    <Column field="bestSquat" header="SQ" :sortable="true" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span class="font-semibold">{{ formatWeight(data.bestSquat) }}</span>
                      </template>
                    </Column>
                    <Column field="squatPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.squatPlacement) }}
                      </template>
                    </Column>
                    <Column header="BP1" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.bench1)">{{ formatAttempt(data.bench1) }}</span>
                      </template>
                    </Column>
                    <Column header="BP2" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.bench2)">{{ formatAttempt(data.bench2) }}</span>
                      </template>
                    </Column>
                    <Column header="BP3" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.bench3)">{{ formatAttempt(data.bench3) }}</span>
                      </template>
                    </Column>
                    <Column field="bestBench" header="BP" :sortable="true" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span class="font-semibold">{{ formatWeight(data.bestBench) }}</span>
                      </template>
                    </Column>
                    <Column field="benchPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.benchPlacement) }}
                      </template>
                    </Column>
                    <Column header="DL1" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.deadlift1)">{{ formatAttempt(data.deadlift1) }}</span>
                      </template>
                    </Column>
                    <Column header="DL2" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.deadlift2)">{{ formatAttempt(data.deadlift2) }}</span>
                      </template>
                    </Column>
                    <Column header="DL3" :sortable="false" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span :class="getAttemptCellClass(data.deadlift3)">{{ formatAttempt(data.deadlift3) }}</span>
                      </template>
                    </Column>
                    <Column field="bestDeadlift" header="DL" :sortable="true" align="right" style="width: 4rem">
                      <template #body="{ data }">
                        <span class="font-semibold">{{ formatWeight(data.bestDeadlift) }}</span>
                      </template>
                    </Column>
                    <Column field="deadliftPlacement" :header="$t('meets.pl')" :sortable="true" align="right" style="width: 3rem">
                      <template #body="{ data }">
                        {{ formatPlacement(data.deadliftPlacement) }}
                      </template>
                    </Column>
                    <Column field="total" :header="$t('general.total')" :sortable="true" align="right" style="width: 5rem">
                      <template #body="{ data }">
                        <span class="font-bold">{{ formatWeight(data.total) }}</span>
                      </template>
                    </Column>
                  </DataTable>
              </div>
              </LazyMount>
            </div>
          </div>
          </template>
        </TabPanel>

        <TabPanel value="gl-ranking">
          <template v-if="visitedTabs.has('gl-ranking')">
          <div class="overflow-x-auto">
              <DataTable
                :value="glRankedResults"
                :loading="false"
                :paginator="true"
                :rows="50"
                :rows-per-page-options="[25, 50, 100]"
                :sort-field="'gl'"
                :sort-order="-1"
                striped-rows
                class="w-full border border-surface-200 dark:border-surface-700"
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
          </template>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </MeetTabContent>
</template>

<script setup lang="ts">
import MeetTabContent from "@/components/meets/MeetTabContent.vue"
import LazyMount from "@/components/meets/LazyMount.vue"
import { DISQUALIFIED } from "~/lib/constants/constants"
import { formatWeightClass, formatSex, formatDivision, formatWeight, formatGL, formatSexAlternative, nameGradientStyle } from "@/lib/utils/client"

const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string

definePageMeta({
  layout: "openvpf-competitions",
  keepalive: true,
  pageTransition: false
})

const { meet, groupedByGenderDivision, resultsWithAthletes, pending, error } = useMeetData(slug)

const validTabs = ["scoresheet", "detailed", "gl-ranking"] as const
type TabValue = typeof validTabs[number]

const activeTab = computed<TabValue>(() => {
  const tab = route.query.tab
  return validTabs.includes(tab as TabValue) ? (tab as TabValue) : "scoresheet"
})

const visitedTabs = ref<Set<TabValue>>(new Set([activeTab.value]))
watch(activeTab, (tab) => visitedTabs.value.add(tab), { immediate: true })

function setActiveTab(value: string | number) {
  const tab = value as TabValue
  router.replace({ query: { ...route.query, tab: tab === "scoresheet" ? undefined : tab } })
}

function tabClass(active: boolean): string {
  const base =
    "flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-4 px-[1.125rem] font-semibold transition-colors duration-200 -mb-px focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary"
  const activeClass = "border-b-2 border-primary text-primary"
  const inactiveClass =
    "border-b border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-0"
  return active ? `${base} ${activeClass}` : `${base} ${inactiveClass}`
}

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

const formatPlacement = (placement: number | null | undefined): string => {
  if (placement === null || placement === undefined) return "-"
  if (placement === DISQUALIFIED) return "DSQ"
  return String(placement)
}

const formatAttempt = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined) return "-"
  if (attempt === 0) return "0"
  return attempt.toFixed(2)
}

const getAttemptCellClass = (attempt: number | null | undefined): string => {
  if (attempt === null || attempt === undefined || attempt <= 0) {
    return "bg-surface-200 text-surface-700 px-1 py-0.5 rounded"
  }
  return "bg-primary/10 text-primary font-semibold px-1 py-0.5 rounded"
}

useSeoMeta({
  title: computed(() => meet.value ? `${meet.value.meetName} - VPF` : "VPF Meet"),
  ogType: "website",
  ogTitle: computed(() => meet.value ? meet.value.meetName : "VPF Meet"),
  ogDescription: computed(() => meet.value ? `View results and scoresheet for ${meet.value.meetName}` : "View meet results"),
})
</script>

<style scoped>
.p-tabpanels {
  padding-left: 0px;
  padding-right: 0px;
}
</style>

<template>
  <div>
    <CompetitionHeader :meet="meet" />

    <PageSection>
      <TableSkeleton v-if="pending && !meet" />
      <div v-else-if="error || !meet" class="rounded-md border border-surface-200 bg-surface-0">
        <TableEmpty :title="$t('meets.meetNotFound')" :body="$t('error.notFoundBody')">
          <Button v-slot="slotProps" as-child severity="secondary">
            <NuxtLinkLocale to="/competitions" :class="slotProps.class">{{ $t("meets.title") }}</NuxtLinkLocale>
          </Button>
        </TableEmpty>
      </div>
      <div v-else-if="results.length === 0" class="rounded-md border border-surface-200 bg-surface-0">
        <TableEmpty :title="$t('meets.noResults')" />
      </div>

      <Tabs v-else :value="activeTab" @update:value="setActiveTab">
        <TabList unstyled :aria-label="$t('meets.tabsLabel')" :pt="{ tabList: { class: 'flex overflow-x-auto overflow-y-hidden border-b border-surface-200' }, activeBar: { class: 'hidden' } }">
          <Tab v-for="tab in tabs" :key="tab.value" v-slot="{ active, a11yAttrs, onClick }" :value="tab.value" as-child>
            <button
              type="button"
              v-bind="a11yAttrs"
              class="-mb-px min-h-12 shrink-0 cursor-pointer border-b-[3px] px-4 font-display text-base font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-colors duration-120 ease-snap focus-visible:-outline-offset-2"
              :class="active ? 'border-accent-fill text-color' : 'border-transparent text-muted-color hover:text-color'"
              @click="onClick"
            >
              {{ tab.label }}
            </button>
          </Tab>
        </TabList>
        <TabPanels unstyled class="pt-6">
          <TabPanel value="scoresheet" unstyled>
            <div v-if="visitedTabs.has('scoresheet')" class="grid gap-8">
              <section
                v-for="group in groups"
                :key="group.key"
                :aria-labelledby="`sheet-${group.key}`"
                class="grid gap-3 [contain-intrinsic-size:auto_800px] [content-visibility:auto]"
              >
                <h2 :id="`sheet-${group.key}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
                <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
                  <ResultsTable
                    :columns="scoresheetColumns"
                    :groups="group.weightClasses"
                    :caption="$t('meets.scoresheetCaption', { group: group.label })"
                    :row-key="(row) => row.resultId"
                  >
                    <template #cell-place="{ row }">
                      <RankCell v-bind="placeProps(row.placement)" />
                    </template>
                    <template #cell-athlete="{ row }">
                      <AthleteCell v-bind="athleteProps(row)" :meta="bodyWeight(row)" />
                    </template>
                    <template v-for="lift in LIFTS" :key="lift.key" #[`cell-${lift.key}`]="{ row }">
                      <LiftCell :value="row[lift.best]" />
                      <span v-if="row[lift.place] && row.placement !== DISQUALIFIED" class="block font-sans text-xs font-normal text-muted-color">
                        {{ $t("meets.liftPlace", { n: row[lift.place] }) }}
                      </span>
                    </template>
                    <template #cell-total="{ row }">
                      <LiftCell :value="row.total" />
                    </template>
                    <template #cell-gl="{ row }">
                      <GlCell :value="row.gl" />
                    </template>
                  </ResultsTable>
                </div>
              </section>
            </div>
          </TabPanel>

          <TabPanel value="detailed" unstyled>
            <div v-if="visitedTabs.has('detailed')" class="grid gap-8">
              <section
                v-for="group in groups"
                :key="group.key"
                :aria-labelledby="`detail-${group.key}`"
                class="grid gap-3 [contain-intrinsic-size:auto_800px] [content-visibility:auto]"
              >
                <h2 :id="`detail-${group.key}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
                <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
                  <ResultsTable
                    :columns="detailedColumns"
                    :groups="group.weightClasses"
                    :caption="$t('meets.detailedCaption', { group: group.label })"
                    :row-key="(row) => row.resultId"
                  >
                    <template #cell-place="{ row }">
                      <RankCell v-bind="placeProps(row.placement)" />
                    </template>
                    <template #cell-athlete="{ row }">
                      <AthleteCell v-bind="athleteProps(row)" :meta="bodyWeight(row)" />
                    </template>
                    <template v-for="col in ATTEMPT_COLUMNS" :key="col.key" #[`cell-${col.key}`]="{ row }">
                      <AttemptCell :value="row[col.key]" :best="row[col.key] !== null && row[col.key] === row[col.best]" />
                    </template>
                    <template #cell-total="{ row }">
                      <LiftCell :value="row.total" />
                    </template>
                  </ResultsTable>
                </div>
              </section>
            </div>
          </TabPanel>

          <TabPanel value="gl-ranking" unstyled>
            <div v-if="visitedTabs.has('gl-ranking')" class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
              <ResultsTable
                :columns="glColumns"
                :rows="glPage"
                :caption="$t('meets.glCaption')"
                sort-key="gl"
                :row-key="(row) => row.resultId"
              >
                <template #cell-rank="{ row }">
                  <RankCell :rank="row.rank" />
                </template>
                <template #cell-athlete="{ row }">
                  <AthleteCell v-bind="athleteProps(row)" :meta="meta(row)" />
                </template>
                <template #cell-gl="{ row }">
                  <GlCell :value="row.gl" />
                </template>
                <template #cell-total="{ row }">
                  <LiftCell :value="row.total" />
                </template>
                <template #cell-squat="{ row }">
                  <LiftCell :value="row.bestSquat" />
                </template>
                <template #cell-bench="{ row }">
                  <LiftCell :value="row.bestBench" />
                </template>
                <template #cell-deadlift="{ row }">
                  <LiftCell :value="row.bestDeadlift" />
                </template>
              </ResultsTable>
              <TablePager v-model:page="glPageNumber" v-model:page-size="glPageSize" :total="glRanked.length" />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { DISQUALIFIED } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, SEX_LABEL_KEY, formatKg, formatWeightClass } from "~/lib/domain/format"
import type { MeetResult } from "~/types/meets"
import type { TableColumn } from "~/types/tables"
import type { UserPublicWithDecorators } from "~/types/users"

type Row = MeetResult & { athlete?: UserPublicWithDecorators }

definePageMeta({ layout: "default" })

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const slug = route.params.slug as string

const { meet, results, groupedByGenderDivision, resultsWithAthletes, pending, error } = useMeetData(slug)

const validTabs = ["scoresheet", "detailed", "gl-ranking"] as const
type TabValue = typeof validTabs[number]

const activeTab = computed<TabValue>(() => {
  const tab = route.query.tab
  return validTabs.includes(tab as TabValue) ? (tab as TabValue) : "scoresheet"
})

// A tab renders the first time it is opened and then stays mounted.
const visitedTabs = ref(new Set<TabValue>([activeTab.value]))
watch(activeTab, (tab) => visitedTabs.value.add(tab))

function setActiveTab(value: string | number) {
  const tab = value as TabValue
  router.replace({ query: { ...route.query, tab: tab === "scoresheet" ? undefined : tab } })
}

const tabs = computed(() => [
  { value: "scoresheet", label: t("meets.scoresheet") },
  { value: "detailed", label: t("meets.detailedScoresheet") },
  { value: "gl-ranking", label: t("meets.athleteRankedByGlPoint") },
])

/** One section per category and division, each split into weight-class row groups. */
const groups = computed(() => groupedByGenderDivision.value.flatMap((sexGroup) =>
  sexGroup.divisions.map((divisionGroup) => {
    const byClass = new Map<number, Row[]>()
    for (const row of divisionGroup.results) {
      const list = byClass.get(row.weightClass)
      if (list) list.push(row)
      else byClass.set(row.weightClass, [row])
    }
    return {
      key: `${sexGroup.sex}-${divisionGroup.division}`,
      label: t("meets.groupTitle", { sex: t(SEX_LABEL_KEY[sexGroup.sex]), division: t(DIVISION_LABEL_KEY[divisionGroup.division]) }),
      weightClasses: [...byClass].map(([weightClass, rows]) => ({
        key: String(weightClass),
        label: formatWeightClass(weightClass, sexGroup.sex),
        rows,
      })),
    }
  })))

const LIFTS = [
  { key: "squat", best: "bestSquat", place: "squatPlacement" },
  { key: "bench", best: "bestBench", place: "benchPlacement" },
  { key: "deadlift", best: "bestDeadlift", place: "deadliftPlacement" },
] as const

const ATTEMPT_COLUMNS = (["squat", "bench", "deadlift"] as const).flatMap((lift) =>
  ([1, 2, 3] as const).map((n) => ({
    key: `${lift}${n}` as `${typeof lift}${typeof n}`,
    lift,
    n,
    best: (lift === "squat" ? "bestSquat" : lift === "bench" ? "bestBench" : "bestDeadlift") as "bestSquat" | "bestBench" | "bestDeadlift",
  })))

const liftShort = { squat: "meets.sq", bench: "meets.bp", deadlift: "meets.dl" } as const

const scoresheetColumns = computed<TableColumn[]>(() => [
  { key: "place", label: "#", srLabel: t("general.place"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  ...LIFTS.map((lift) => ({ key: lift.key, label: t("ranking.withUnit", { label: t(`general.${lift.key}`) }), numeric: true })),
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
  { key: "gl", label: t("ranking.glPoints"), numeric: true },
])

const detailedColumns = computed<TableColumn[]>(() => [
  { key: "place", label: "#", srLabel: t("general.place"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  ...ATTEMPT_COLUMNS.map((col) => ({
    key: col.key,
    label: `${t(liftShort[col.lift])}${col.n}`,
    srLabel: t("meets.attemptLabel", { lift: t(`general.${col.lift}`), n: col.n }),
    numeric: true,
  })),
  { key: "total", label: t("ranking.withUnit", { label: t("general.total") }), numeric: true },
])

const glColumns = computed<TableColumn[]>(() => [
  { key: "rank", label: "#", srLabel: t("tables.rank"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  { key: "gl", label: t("ranking.glPoints"), numeric: true, sortable: true },
  ...(["total", "squat", "bench", "deadlift"] as const).map((key) => ({
    key,
    label: t("ranking.withUnit", { label: t(`general.${key}`) }),
    numeric: true,
  })),
])

const glRanked = computed(() => resultsWithAthletes.value
  .filter((r) => r.gl !== null && r.placement !== DISQUALIFIED)
  .sort((a, b) => (b.gl ?? 0) - (a.gl ?? 0))
  .map((r, i) => ({ ...r, rank: i + 1 })))

const glPageNumber = ref(1)
const glPageSize = ref(25)
watch(glPageSize, () => { glPageNumber.value = 1 })
const glPage = computed(() => glRanked.value.slice((glPageNumber.value - 1) * glPageSize.value, glPageNumber.value * glPageSize.value))

function placeProps(placement: number) {
  return placement === DISQUALIFIED
    ? { rank: null, label: t("meets.dsq"), labelTitle: t("meets.dsqTitle") }
    : { rank: placement }
}

function athleteProps(row: Row) {
  return {
    name: row.athlete?.fullName ?? row.vpfId,
    to: row.athlete ? `/athletes/${row.athlete.slug || row.athlete.vpfId}` : null,
    decorator1: row.athlete?.decorator1,
    decorator2: row.athlete?.decorator2,
  }
}

function bodyWeight(row: Row) {
  return row.bodyWeight ? t("meets.bodyWeightValue", { kg: formatKg(row.bodyWeight, locale.value) }) : undefined
}

function meta(row: Row) {
  return [t(SEX_LABEL_KEY[row.sex]), formatWeightClass(row.weightClass, row.sex), t(DIVISION_LABEL_KEY[row.division])].join(" · ")
}

useSeoMeta({
  title: () => meet.value?.meetName ?? t("meets.title"),
  ogType: "website",
  ogTitle: () => meet.value?.meetName ?? t("meets.title"),
  description: () => (meet.value ? t("meets.heldOn", { date: meet.value.hostDate ?? "" }) : ""),
})
</script>

<template>
  <div>
    <PageHeader
      :kicker="$t('records.kicker')"
      :title="$t('records.title')"
      :lede="$t('records.lede')"
      :help-label="$t('records.helpLabel')"
    >
      <template #help>
        <p>{{ $t("records.help1") }}</p>
        <p>{{ $t("records.help2") }}</p>
      </template>
    </PageHeader>

    <PageSection class="grid gap-6">
      <form
        :aria-label="$t('records.filterLabel')"
        class="grid min-w-0 gap-4 rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0 p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-[1fr_1fr_1fr_1.3fr]"
        @submit.prevent
      >
        <SegmentedControl
          :model-value="sex"
          :legend="$t('ranking.category')"
          :options="sexOptions"
          @update:model-value="query.update({ sex: $event })"
        />
        <FilterSelect
          :model-value="division"
          :label="$t('general.division')"
          :hint="$t('filters.divisionHint')"
          :options="divisionOptions"
          @update:model-value="query.update({ division: $event })"
        />
        <FilterSelect
          :model-value="query.state.value.year"
          :label="$t('general.season')"
          :options="yearOptions"
          :placeholder="$t('general.latest')"
          @update:model-value="query.update({ year: $event })"
        />
        <SegmentedControl
          :model-value="mode"
          :legend="$t('records.view')"
          :options="modeOptions"
          @update:model-value="query.update({ mode: $event })"
        />
      </form>

      <!-- Current records: weight class × lift. -->
      <template v-if="mode === 'current'">
        <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0" :aria-busy="board.pending.value || undefined">
          <TableSkeleton v-if="!board.loaded.value" :columns="4" :rows="9" />
          <TableEmpty
            v-else-if="boardRows.length === 0"
            :title="$t('records.matrixEmptyTitle')"
            :body="$t('records.matrixEmptyBody', { category: categoryLabel, division: divisionLabel })"
          />
          <RecordsMatrix
            v-else
            :rows="boardRows"
            :sex="sex"
            :weight-classes="weightClasses"
            :caption="$t('records.matrixCaption', { category: categoryLabel, division: divisionLabel })"
            :decorators="decoratorMap"
            @open="openRecord"
          />
        </div>
      </template>

      <!-- Records broken at one championship, lift by lift. -->
      <template v-else>
        <TableSkeleton v-if="!history.loaded.value" :columns="4" />
        <div v-else-if="!history.meet.value" class="rounded-md border border-surface-200 bg-surface-0">
          <TableEmpty :title="$t('records.historyEmptyTitle')" :body="$t('records.noMeet')" />
        </div>
        <template v-else>
          <p class="text-lg">
            <i18n-t keypath="records.brokenAt" tag="span">
              <template #meet>
                <NuxtLinkLocale :to="`/competitions/${history.meet.value.meetSlug}`" class="font-semibold decoration-accent decoration-2 underline-offset-3 hover:underline">
                  {{ history.meet.value.meetName }}
                </NuxtLinkLocale>
              </template>
            </i18n-t>
            <span class="text-muted-color"> · {{ formatDate(history.meet.value.hostDate, locale, "long") }}</span>
          </p>
          <div v-if="historyByLift.length === 0" class="rounded-md border border-surface-200 bg-surface-0">
            <TableEmpty
              :title="$t('records.historyEmptyTitle')"
              :body="$t('records.historyEmptyBody', { category: categoryLabel, division: divisionLabel })"
            />
          </div>
          <section v-for="group in historyByLift" :key="group.lift" class="grid gap-3" :aria-labelledby="`lift-${group.lift}`">
            <h2 :id="`lift-${group.lift}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
            <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
              <RecordHistoryTable
                :rows="group.rows"
                :caption="$t('records.historyCaption', { lift: group.label, meet: history.meet.value.meetName })"
                :decorators="decoratorMap"
              />
            </div>
          </section>
        </template>
      </template>
    </PageSection>

    <RecordDetailDrawer v-model:visible="drawerOpen" :record="selected" />
  </div>
</template>

<script setup lang="ts">
import { RANKED_DIVISION, RECORD_START_YEAR, WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, SEX_LABEL_KEY, formatDate } from "~/lib/domain/format"
import type { RecordRow } from "~/types/records"
import type { Division, Sex } from "~/types/union-types"

definePageMeta({ layout: "default" })

const { t, locale } = useI18n()

const query = useQueryState({ mode: "current", sex: "male", division: "open", year: "" })

const mode = computed(() => (query.state.value.mode === "history" ? "history" : "current"))
const sex = computed<Sex>(() => (query.state.value.sex === "female" ? "female" : "male"))
const division = computed<Division>(() =>
  RANKED_DIVISION.includes(query.state.value.division) ? query.state.value.division as Division : "open")
const year = computed(() => (query.state.value.year ? Number(query.state.value.year) : null))

const board = useRecords(year, { key: "records-board", immediate: () => mode.value === "current" })
const history = useRecordHistory(year, () => mode.value === "history")

// The previous season's standing records, for "was … kg" and the improvement column.
const previousYear = computed(() => (history.meet.value ? history.meet.value.systemYear - 1 : null))
const previous = useRecords(previousYear, {
  key: "records-previous",
  immediate: () => mode.value === "history" && previousYear.value !== null,
})

const { fetchDecorators, decoratorMap } = useNameDecorators()
onMounted(fetchDecorators)

const weightClasses = computed(() => (sex.value === "female" ? WEIGHT_CLASS_FEMALE : WEIGHT_CLASS_MALE))

const inCategory = (row: RecordRow) => row.sex === sex.value && row.division === division.value
const boardRows = computed(() => board.rows.value.filter(inCategory))

const LIFTS = ["squat", "bench", "deadlift", "total"] as const
const liftLabel = (lift: RecordRow["lift"]) => t(lift === "bench" ? "general.benchPress" : `general.${lift}`)

const historyByLift = computed(() => {
  const before = new Map<string, number>()
  for (const row of previous.rows.value) {
    if (inCategory(row)) before.set(`${row.weightClass}-${row.lift}`, row.weight)
  }

  return LIFTS.map((lift) => {
    const rows = history.rows.value
      .filter((row) => row.lift === lift && inCategory(row))
      .sort((a, b) => a.weightClass - b.weightClass || a.weight - b.weight)
      .map((row, i, all) => {
        const earlier = all[i - 1]
        const sameClassBefore = earlier && earlier.weightClass === row.weightClass ? earlier.weight : null
        const previousRecord = sameClassBefore === null ? before.get(`${row.weightClass}-${lift}`) ?? null : null
        const base = sameClassBefore ?? previousRecord
        return { ...row, previous: previousRecord, improvement: base !== null ? row.weight - base : null }
      })
    return { lift, label: liftLabel(lift), rows }
  }).filter((group) => group.rows.length > 0)
})

const selected = ref<RecordRow | null>(null)
const drawerOpen = ref(false)
function openRecord(row: RecordRow) {
  selected.value = row
  drawerOpen.value = true
}

const categoryLabel = computed(() => t(SEX_LABEL_KEY[sex.value]))
const divisionLabel = computed(() => t(DIVISION_LABEL_KEY[division.value]))

const sexOptions = computed(() => [
  { value: "male", label: t("general.men") },
  { value: "female", label: t("general.women") },
])

const divisionOptions = computed(() =>
  RANKED_DIVISION.map((d) => ({ value: d, label: t(DIVISION_LABEL_KEY[d as Division]) })))

const yearOptions = computed(() => {
  const years: { value: string; label: string }[] = [{ value: "", label: t("general.latest") }]
  for (let y = new Date().getFullYear(); y >= RECORD_START_YEAR; y--) years.push({ value: String(y), label: String(y) })
  return years
})

const modeOptions = computed(() => [
  { value: "current", label: t("records.currentRecords") },
  { value: "history", label: t("records.recordHistory") },
])

useSeoMeta({
  title: () => t("records.title"),
  description: () => t("records.lede"),
  ogTitle: () => t("records.title"),
  ogDescription: () => t("records.lede"),
})
</script>

<template>
  <div>
    <PageHeader
      :kicker="$t('ranking.kicker')"
      :title="$t('ranking.title')"
      :lede="$t('ranking.lede')"
      :help-label="$t('ranking.glQuestion')"
    >
      <template #help>
        <p>{{ $t("ranking.glAnswer1") }}</p>
        <p>{{ $t("ranking.glAnswer2") }}</p>
      </template>
      <template #aside>
        <RankingLeaders :rows="ranked" :sort="apiSort" :meta="meta" :decorators="decoratorMap" />
      </template>
    </PageHeader>

    <PageSection class="grid gap-6">
      <form
        role="search"
        :aria-label="$t('ranking.filterLabel')"
        class="grid min-w-0 content-start gap-4 rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0 p-4 md:p-6"
        @submit.prevent
      >
        <SearchField
          ref="search"
          :model-value="query.state.value.q"
          :label="$t('ranking.searchAthlete')"
          :placeholder="$t('ranking.searchPlaceholder')"
          :hint="$t('ranking.searchHint')"
          :clear-label="$t('filters.clearSearch')"
          @update:model-value="setFilter({ q: $event }, true)"
        />

        <button
          type="button"
          class="flex min-h-11 cursor-pointer items-center justify-between rounded border border-surface-300 px-3 text-sm font-medium md:hidden"
          :aria-expanded="filtersOpen"
          :aria-controls="filterGridId"
          @click="filtersOpen = !filtersOpen"
        >
          <span class="inline-flex items-center gap-2">
            <AppIcon name="lucide:sliders-horizontal" class="size-5" />
            {{ $t("filters.toggle") }}
            <span v-if="activeCount" class="inline-grid h-6 min-w-6 place-items-center rounded-full bg-accent-fill px-1.5 text-xs font-semibold text-on-accent">{{ activeCount }}</span>
          </span>
          <AppIcon name="lucide:chevron-down" class="size-5 transition-transform duration-200 ease-snap" :class="filtersOpen && 'rotate-180'" />
        </button>

        <div
          :id="filterGridId"
          class="gap-4 sm:grid-cols-2 md:grid lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]"
          :class="filtersOpen ? 'grid' : 'hidden'"
        >
          <SegmentedControl
            :model-value="query.state.value.sex"
            :legend="$t('ranking.category')"
            :options="sexOptions"
            @update:model-value="setSex"
          />
          <FilterSelect
            :model-value="query.state.value.cls"
            :label="$t('general.weightClass')"
            :options="weightClassOptions"
            :grouped="!query.state.value.sex"
            :placeholder="$t('general.all')"
            @update:model-value="setFilter({ cls: $event })"
          />
          <FilterSelect
            :model-value="query.state.value.div"
            :label="$t('general.division')"
            :hint="$t('filters.divisionHint')"
            :options="divisionOptions"
            :placeholder="$t('general.all')"
            @update:model-value="setFilter({ div: $event })"
          />
          <FilterSelect
            :model-value="query.state.value.meet"
            :label="$t('ranking.competitionType')"
            :options="meetOptions"
            @update:model-value="setFilter({ meet: $event })"
          />
          <FilterSelect
            :model-value="query.state.value.sort"
            :label="$t('ranking.sortBy')"
            :options="sortOptions"
            @update:model-value="setFilter({ sort: $event })"
          />
        </div>
      </form>

      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3 text-sm">
          <span role="status" aria-live="polite" class="mr-1 font-display text-lg font-bold tracking-[0.04em] uppercase">
            {{ loaded ? $t("ranking.count", visible.length) : $t("tables.loading") }}
          </span>
          <FilterChips :chips="chips" @remove="removeChip" @reset="resetAll" />
        </div>

        <div ref="panel" tabindex="-1" class="scroll-mt-20 overflow-clip rounded-md border border-surface-200 bg-surface-0 focus:outline-none">
          <TableSkeleton v-if="!loaded" :columns="5" />
          <template v-else-if="visible.length">
            <ResultsTable
              :columns="columns"
              :rows="pageRows"
              :caption="$t('ranking.caption', { sort: sortLabel })"
              :sort-key="query.state.value.sort"
              :row-key="(row) => row.vpfId"
              :busy="pending"
              @sort="setFilter({ sort: $event })"
            >
              <template #cell-rank="{ row }">
                <RankCell :rank="row.rank" />
              </template>
              <template #cell-athlete="{ row }">
                <AthleteCell
                  :name="row.name"
                  :to="`/athletes/${row.slug || row.vpfId}`"
                  :meta="meta(row)"
                  :decorator1="decoratorMap.get(row.vpfId)?.decorator1"
                  :decorator2="decoratorMap.get(row.vpfId)?.decorator2"
                />
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
            <TablePager
              :page="page"
              :page-size="query.state.value.size"
              :total="visible.length"
              @update:page="goToPage"
              @update:page-size="setFilter({ size: $event })"
            />
          </template>
          <TableEmpty v-else :title="$t('ranking.emptyTitle')" :body="$t('ranking.emptyBody')">
            <AppButton variant="secondary" @click="resetAll">{{ $t("filters.reset") }}</AppButton>
          </TableEmpty>
        </div>
      </div>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE, RANKED_DIVISION } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, MEET_TYPE_LABEL_KEY, SEX_LABEL_KEY, foldForSearch, formatWeightClass } from "~/lib/domain/format"
import type { SortKey } from "~/lib/domain/results"
import type { TableColumn } from "~/types/tables"
import type { RankingRow } from "~/types/results"
import type { Division, MeetType, Sex } from "~/types/union-types"

definePageMeta({ layout: "default" })

const { t } = useI18n()

/** URL sort names are short; the API uses the result column names. */
const SORTS = { gl: "gl", total: "total", squat: "bestSquat", bench: "bestBench", deadlift: "bestDeadlift" } as const satisfies Record<string, SortKey>
type SortName = keyof typeof SORTS

const query = useQueryState({
  q: "",
  sex: "",
  /** "male-74": a weight class belongs to one category. */
  cls: "",
  div: "",
  /** Rankings open on national championships, as before; "all" lifts the filter. */
  meet: "national",
  sort: "gl",
  page: 1,
  size: 25,
})

const sortName = computed<SortName>(() => (query.state.value.sort in SORTS ? query.state.value.sort as SortName : "gl"))
const apiSort = computed(() => SORTS[sortName.value])

const filters = computed(() => {
  const s = query.state.value
  const [clsSex, clsWeight] = s.cls.split("-")
  return {
    sort: apiSort.value,
    sex: (s.sex || clsSex || undefined) as Sex | undefined,
    division: (s.div || undefined) as Division | undefined,
    weightClass: clsWeight ? Number(clsWeight) : undefined,
    meetType: (s.meet === "all" ? undefined : s.meet) as MeetType | undefined,
  }
})

const { rows: ranked, loaded, pending } = useRankings(filters)

// VIP name colours, fetched once in the browser and shared across pages.
const { fetchDecorators, decoratorMap } = useNameDecorators()
onMounted(fetchDecorators)

/** Search narrows the list but keeps each athlete's rank within the filter set. */
const visible = computed(() => {
  const q = foldForSearch(query.state.value.q.trim())
  if (!q) return ranked.value
  return ranked.value.filter((row) => foldForSearch(row.name).includes(q) || row.vpfId.toLowerCase().includes(q))
})

const pageCount = computed(() => Math.max(1, Math.ceil(visible.value.length / query.state.value.size)))
const page = computed(() => Math.min(Math.max(1, query.state.value.page), pageCount.value))
const pageRows = computed(() => {
  const start = (page.value - 1) * query.state.value.size
  return visible.value.slice(start, start + query.state.value.size)
})

/** Any filter change goes back to page 1. Typing replaces the history entry instead of adding one per key. */
function setFilter(patch: Partial<typeof query.defaults>, replace = false) {
  return query.update({ ...patch, page: 1 }, { replace })
}

function setSex(sex: string) {
  const cls = query.state.value.cls
  setFilter({ sex, cls: cls && sex && !cls.startsWith(`${sex}-`) ? "" : cls })
}

const panel = ref<HTMLElement | null>(null)
async function goToPage(next: number) {
  await query.update({ page: next })
  panel.value?.focus({ preventScroll: true })
  panel.value?.scrollIntoView({ block: "start" })
}

const search = ref<{ focus: () => void } | null>(null)
async function resetAll() {
  await query.reset()
  search.value?.focus()
}

function removeChip(key: string) {
  const s = query.defaults
  if (key === "q") setFilter({ q: s.q })
  else if (key === "sex") setSex("")
  else setFilter({ [key]: s[key as keyof typeof s] })
}

const filtersOpen = ref(false)
const filterGridId = useId()
onMounted(() => {
  // Open the disclosure on phones when the URL already carries filters.
  if (activeCount.value) filtersOpen.value = true
})

// --- Labels -----------------------------------------------------------------

function weightClassLabel(cls: string) {
  const [sex, weight] = cls.split("-")
  return formatWeightClass(Number(weight), sex)
}

function meta(row: RankingRow) {
  return [
    t(SEX_LABEL_KEY[row.sex]),
    formatWeightClass(row.weightClass, row.sex),
    row.division ? t(DIVISION_LABEL_KEY[row.division]) : null,
  ].filter(Boolean).join(" · ")
}

const sortLabels = computed<Record<SortName, string>>(() => ({
  gl: t("ranking.glPoints"),
  total: t("general.total"),
  squat: t("general.squat"),
  bench: t("general.bench"),
  deadlift: t("general.deadlift"),
}))
const sortLabel = computed(() => sortLabels.value[sortName.value])

const columns = computed<TableColumn[]>(() => [
  { key: "rank", label: "#", srLabel: t("tables.rank"), pin: "rank" },
  { key: "athlete", label: t("ranking.athlete"), pin: "name", rowHeader: true },
  { key: "gl", label: sortLabels.value.gl, numeric: true, sortable: true },
  ...(["total", "squat", "bench", "deadlift"] as const).map((key) => ({
    key,
    label: t("ranking.withUnit", { label: sortLabels.value[key] }),
    numeric: true,
    sortable: true,
  })),
])

const sexOptions = computed(() => [
  { value: "", label: t("general.all") },
  { value: "male", label: t("general.men") },
  { value: "female", label: t("general.women") },
])

const weightClassOptions = computed(() => {
  const all = { value: "", label: t("general.all") }
  const classes = (sex: Sex) => (sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE)
    .map((w) => ({ value: `${sex}-${w}`, label: formatWeightClass(w, sex) }))
  const sex = query.state.value.sex as Sex | ""
  if (sex) return [all, ...classes(sex)]
  return [
    { label: t("general.all"), items: [all] },
    { label: t("general.men"), items: classes("male") },
    { label: t("general.women"), items: classes("female") },
  ]
})

const divisionOptions = computed(() => [
  { value: "", label: t("general.all") },
  ...RANKED_DIVISION.map((d) => ({ value: d, label: t(DIVISION_LABEL_KEY[d as Division]) })),
])

const meetOptions = computed(() => [
  { value: "all", label: t("ranking.allMeetTypes") },
  ...(["national", "national_qualifier", "amateur"] as const).map((m) => ({ value: m, label: t(MEET_TYPE_LABEL_KEY[m]) })),
])

const sortOptions = computed(() => (Object.keys(SORTS) as SortName[]).map((value) => ({ value, label: sortLabels.value[value] })))

const chips = computed(() => {
  const s = query.state.value
  const out: { key: string; label: string }[] = []
  if (s.q) out.push({ key: "q", label: t("ranking.searchChip", { q: s.q }) })
  if (s.sex) out.push({ key: "sex", label: t(SEX_LABEL_KEY[s.sex as Sex]) })
  if (s.cls) out.push({ key: "cls", label: weightClassLabel(s.cls) })
  if (s.div) out.push({ key: "div", label: t(DIVISION_LABEL_KEY[s.div as Division]) })
  if (s.meet !== query.defaults.meet) out.push({ key: "meet", label: meetOptions.value.find((o) => o.value === s.meet)?.label ?? s.meet })
  return out
})

/** Filters hidden behind the phone disclosure that differ from the default, plus a non-default sort. */
const activeCount = computed(() => query.countActive(["q", "page", "size"]))

useSeoMeta({
  title: () => t("ranking.title"),
  description: () => t("ranking.lede"),
  ogTitle: () => t("ranking.title"),
  ogDescription: () => t("ranking.lede"),
  ogType: "website",
})
</script>

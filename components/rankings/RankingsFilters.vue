<template>
  <form
    role="search"
    :aria-label="$t('ranking.filterLabel')"
    class="grid min-w-0 content-start gap-4 rounded-md border border-t-[3px] border-surface-200 border-t-ink bg-surface-0 p-4 md:p-6"
    @submit.prevent
  >
    <SearchField
      ref="search"
      :model-value="values.q"
      :label="$t('ranking.searchAthlete')"
      :placeholder="$t('ranking.searchPlaceholder')"
      :hint="$t('ranking.searchHint')"
      :clear-label="$t('filters.clearSearch')"
      @update:model-value="emit('change', { q: $event }, true)"
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
        :model-value="values.sex"
        :legend="$t('ranking.category')"
        :options="sexOptions"
        @update:model-value="emit('sex', $event)"
      />
      <FilterSelect
        :model-value="values.cls"
        :label="$t('general.weightClass')"
        :options="weightClassOptions"
        :grouped="!values.sex"
        :placeholder="$t('general.all')"
        @update:model-value="emit('change', { cls: $event })"
      />
      <FilterSelect
        :model-value="values.div"
        :label="$t('general.division')"
        :hint="$t('filters.divisionHint')"
        :options="divisionOptions"
        :placeholder="$t('general.all')"
        @update:model-value="emit('change', { div: $event })"
      />
      <FilterSelect
        :model-value="values.meet"
        :label="$t('ranking.competitionType')"
        :options="meetOptions"
        @update:model-value="emit('change', { meet: $event })"
      />
      <FilterSelect
        :model-value="values.sort"
        :label="$t('ranking.sortBy')"
        :options="sortOptions"
        @update:model-value="emit('change', { sort: $event })"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { RANKED_DIVISION, WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, MEET_TYPE_LABEL_KEY, formatWeightClass } from "~/lib/domain/format"
import { RANKING_MEET_TYPES, SORTS, SORT_LABEL_KEYS, type RankingQuery, type SortName } from "~/lib/domain/rankings"
import type { Division, Sex } from "~/types/union-types"

/** The rankings filters: search, category, weight class, division, competition type and sort. */
const props = defineProps<{ values: RankingQuery; activeCount: number }>()
const emit = defineEmits<{
  change: [patch: Partial<RankingQuery>, replace?: boolean]
  sex: [sex: string]
}>()

const { t } = useI18n()

const search = ref<{ focus: () => void } | null>(null)
defineExpose({ focusSearch: () => search.value?.focus() })

const filtersOpen = ref(false)
const filterGridId = useId()
onMounted(() => {
  // Open the disclosure on phones when the URL already carries filters.
  if (props.activeCount) filtersOpen.value = true
})

const sexOptions = computed(() => [
  { value: "", label: t("general.all") },
  { value: "male", label: t("general.men") },
  { value: "female", label: t("general.women") },
])

const weightClassOptions = computed(() => {
  const all = { value: "", label: t("general.all") }
  const classes = (sex: Sex) => (sex === "male" ? WEIGHT_CLASS_MALE : WEIGHT_CLASS_FEMALE)
    .map((w) => ({ value: `${sex}-${w}`, label: formatWeightClass(w, sex) }))
  const sex = props.values.sex as Sex | ""
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
  ...RANKING_MEET_TYPES.map((m) => ({ value: m, label: t(MEET_TYPE_LABEL_KEY[m]) })),
])

const sortOptions = computed(() => (Object.keys(SORTS) as SortName[]).map((value) => ({ value, label: t(SORT_LABEL_KEYS[value]) })))
</script>

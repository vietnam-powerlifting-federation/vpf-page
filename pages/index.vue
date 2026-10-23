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
        <RankingLeaders :rows="rankings.ranked" :sort="rankings.apiSort" />
      </template>
    </PageHeader>

    <PageSection class="grid gap-6">
      <RankingsFilters
        ref="filters"
        :values="rankings.values"
        :active-count="rankings.activeCount"
        @change="rankings.setFilter"
        @sex="rankings.setSex"
      />
      <RankingsResults
        :rows="rankings.pageRows"
        :total="rankings.visible.length"
        :loaded="rankings.loaded"
        :busy="rankings.pending"
        :page="rankings.page"
        :page-size="rankings.values.size"
        :sort-name="rankings.sortName"
        :chips="rankings.chips"
        @sort="rankings.setSort"
        @page="rankings.goToPage"
        @page-size="rankings.setSize"
        @remove-chip="rankings.removeChip"
        @reset="reset"
      />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })
usePageSeo("ranking.title", "ranking.lede", { ogType: "website" })

const rankings = useRankingsPage()

const filters = ref<{ focusSearch: () => void } | null>(null)
async function reset() {
  await rankings.reset()
  filters.value?.focusSearch()
}
</script>

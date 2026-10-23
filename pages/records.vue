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
      <RecordsFilters
        :mode="records.mode"
        :sex="records.sex"
        :division="records.division"
        :year="records.year"
        @change="records.update"
      />
      <RecordsCurrent
        v-if="records.mode === 'current'"
        :rows="records.boardRows"
        :loaded="records.board.loaded"
        :pending="records.board.pending"
        :sex="records.sex"
        :weight-classes="records.weightClasses"
        :category-label="records.categoryLabel"
        :division-label="records.divisionLabel"
        @open="records.openRecord"
      />
      <RecordsHistory
        v-else
        :loaded="records.history.loaded"
        :meet="records.history.meet"
        :groups="records.historyByLift"
        :category-label="records.categoryLabel"
        :division-label="records.divisionLabel"
      />
    </PageSection>

    <RecordDetailDrawer v-model:visible="records.drawerOpen" :record="records.selected" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })
usePageSeo("records.title", "records.lede")

const records = useRecordsPage()
</script>

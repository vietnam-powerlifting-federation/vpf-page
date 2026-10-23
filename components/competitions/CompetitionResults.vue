<template>
  <TableSkeleton v-if="state === 'loading'" />
  <div v-else-if="state === 'missing'" class="rounded-md border border-surface-200 bg-surface-0">
    <TableEmpty :title="$t('meets.meetNotFound')" :body="$t('error.notFoundBody')">
      <AppButton variant="secondary" to="/competitions">{{ $t("meets.title") }}</AppButton>
    </TableEmpty>
  </div>
  <div v-else-if="state === 'empty'" class="rounded-md border border-surface-200 bg-surface-0">
    <TableEmpty :title="$t('meets.noResults')" />
  </div>

  <AppTabs v-else :model-value="tab" :tabs="tabs" :label="$t('meets.tabsLabel')" @update:model-value="emit('update:tab', $event)">
    <template #scoresheet>
      <MeetScoresheet :sections="sections" />
    </template>
    <template #detailed>
      <MeetDetailedScoresheet :sections="sections" />
    </template>
    <template #gl-ranking>
      <MeetGlRanking :rows="rows" />
    </template>
  </AppTabs>
</template>

<script setup lang="ts">
import type { MeetSection } from "~/lib/domain/meet-rows"
import type { MeetRow } from "~/types/meets"

/** A competition's results area: loading, not-found and empty states, or the three result views as tabs. */
defineProps<{
  state: "loading" | "missing" | "empty" | "ready"
  tab: string
  sections: MeetSection[]
  rows: MeetRow[]
}>()
const emit = defineEmits<{ "update:tab": [tab: string] }>()

const { t } = useI18n()

const tabs = computed(() => [
  { value: "scoresheet", label: t("meets.scoresheet") },
  { value: "detailed", label: t("meets.detailedScoresheet") },
  { value: "gl-ranking", label: t("meets.athleteRankedByGlPoint") },
])
</script>

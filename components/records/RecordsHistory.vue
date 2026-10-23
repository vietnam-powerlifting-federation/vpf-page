<template>
  <!-- Records broken at one championship, lift by lift. -->
  <TableSkeleton v-if="!loaded" :columns="4" />
  <div v-else-if="!meet" class="rounded-md border border-surface-200 bg-surface-0">
    <TableEmpty :title="$t('records.historyEmptyTitle')" :body="$t('records.noMeet')" />
  </div>
  <template v-else>
    <p class="text-lg">
      <i18n-t keypath="records.brokenAt" tag="span">
        <template #meet>
          <NuxtLinkLocale :to="`/competitions/${meet.meetSlug}`" class="font-semibold decoration-accent decoration-2 underline-offset-3 hover:underline">
            {{ meet.meetName }}
          </NuxtLinkLocale>
        </template>
      </i18n-t>
      <span class="text-muted-color"> · {{ formatDate(meet.hostDate, locale, "long") }}</span>
    </p>
    <div v-if="groups.length === 0" class="rounded-md border border-surface-200 bg-surface-0">
      <TableEmpty
        :title="$t('records.historyEmptyTitle')"
        :body="$t('records.historyEmptyBody', { category: categoryLabel, division: divisionLabel })"
      />
    </div>
    <section v-for="group in groups" :key="group.lift" class="grid gap-3" :aria-labelledby="`lift-${group.lift}`">
      <h2 :id="`lift-${group.lift}`" class="font-display text-2xl font-bold uppercase">{{ group.label }}</h2>
      <div class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
        <RecordHistoryTable
          :rows="group.rows"
          :caption="$t('records.historyCaption', { lift: group.label, meet: meet.meetName })"
          :decorators="decoratorMap"
        />
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import { formatDate } from "~/lib/domain/format"
import type { RecordHistoryRow } from "~/lib/domain/record-history"

/** The records broken at one championship, one table per lift. */
defineProps<{
  loaded: boolean
  meet: { meetName: string; meetSlug: string; hostDate: string | null } | null
  groups: { lift: string; label: string; rows: RecordHistoryRow[] }[]
  categoryLabel: string
  divisionLabel: string
}>()

const { locale } = useI18n()
const { decoratorMap } = useNameDecorators()
</script>

<template>
  <div v-if="failed" class="rounded-md border border-surface-200 bg-surface-0">
    <TableEmpty :title="$t('meets.errorLoadingMeets')" />
  </div>
  <template v-else>
    <UpcomingCompetitions :meets="upcoming" :loading="loading" />
    <PastCompetitions :meets="past" />
  </template>
</template>

<script setup lang="ts">
import type { MeetPublic } from "~/types/meets"

/** The competitions list: upcoming cards and past results by year, or an error panel. */
defineProps<{
  upcoming: MeetPublic[]
  past: MeetPublic[]
  loading: boolean
  failed: boolean
}>()
</script>

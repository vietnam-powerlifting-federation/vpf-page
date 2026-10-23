<template>
  <section aria-labelledby="upcoming-title" class="grid gap-4">
    <h2 id="upcoming-title" class="font-display text-[1.75rem] font-bold uppercase">{{ $t("meets.upcoming") }}</h2>
    <div v-if="loading" class="h-40 rounded-md border border-surface-200 bg-surface-0" aria-hidden="true" />
    <p v-else-if="meets.length === 0" class="rounded-md border border-surface-200 bg-surface-0 p-5 text-muted-color">
      {{ $t("meets.noUpcoming") }}
    </p>
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <CompetitionCard v-for="meet in meets" :key="meet.meetId" :meet="meet" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MeetPublic } from "~/types/meets"

/** Competitions open for registration now, then those opening soon, as cards. */
defineProps<{ meets: MeetPublic[]; loading: boolean }>()
</script>

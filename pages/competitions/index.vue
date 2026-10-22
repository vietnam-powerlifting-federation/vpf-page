<template>
  <div>
    <PageHeader :kicker="$t('meets.kicker')" :title="$t('meets.title')" :lede="$t('meets.lede')" />

    <PageSection class="grid gap-10">
      <div v-if="error" class="rounded-md border border-surface-200 bg-surface-0">
        <TableEmpty :title="$t('meets.errorLoadingMeets')" />
      </div>

      <template v-else>
        <section aria-labelledby="upcoming-title" class="grid gap-4">
          <h2 id="upcoming-title" class="font-display text-[1.75rem] font-bold uppercase">{{ $t("meets.upcoming") }}</h2>
          <div v-if="pending && !allMeets.length" class="h-40 rounded-md border border-surface-200 bg-surface-0" aria-hidden="true" />
          <p v-else-if="newMeets.length === 0" class="rounded-md border border-surface-200 bg-surface-0 p-5 text-muted-color">
            {{ $t("meets.noUpcoming") }}
          </p>
          <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CompetitionCard v-for="meet in newMeets" :key="meet.meetId" :meet="meet" />
          </div>
        </section>

        <section aria-labelledby="past-title" class="grid gap-4">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="past-title" class="font-display text-[1.75rem] font-bold uppercase">{{ $t("meets.past") }}</h2>
            <span class="text-sm text-muted-color">{{ $t("meets.pastCount", oldMeets.length) }}</span>
          </div>
          <div v-for="group in byYear" :key="group.year" class="overflow-clip rounded-md border border-surface-200 bg-surface-0">
            <h3 class="bg-board px-4 py-2 font-display text-lg font-bold tracking-[0.08em] text-board-ink">{{ group.year }}</h3>
            <ul>
              <li v-for="meet in group.meets" :key="meet.meetId" class="border-b border-surface-200 last:border-b-0">
                <NuxtLinkLocale
                  :to="`/competitions/${meet.meetSlug}`"
                  class="group grid min-h-14 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 no-underline hover:bg-surface-100 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                >
                  <span class="font-display text-base font-semibold text-muted-color tabular-nums">{{ formatDate(meet.hostDate, locale) }}</span>
                  <span class="min-w-0">
                    <span class="block font-semibold group-hover:underline group-hover:decoration-accent group-hover:decoration-2 group-hover:underline-offset-3">{{ meet.meetName }}</span>
                    <span class="block text-[0.8125rem] text-muted-color">
                      {{ [meet.city, meet.type ? $t(MEET_TYPE_LABEL_KEY[meet.type]) : null].filter(Boolean).join(" · ") }}
                    </span>
                  </span>
                  <AppIcon name="lucide:chevron-right" class="size-5 text-muted-color" />
                </NuxtLinkLocale>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { MEET_TYPE_LABEL_KEY, formatDate } from "~/lib/domain/format"
import type { MeetPublic } from "~/types/meets"

definePageMeta({ layout: "default" })

const { t, locale } = useI18n()
const { allMeets, newMeets, oldMeets, pending, error } = useMeetsList()

/** Past meets grouped by the year they were held, newest first. */
const byYear = computed(() => {
  const groups = new Map<string, MeetPublic[]>()
  for (const meet of oldMeets.value) {
    const year = meet.hostDate ? String(new Date(meet.hostDate).getUTCFullYear()) : String(meet.systemYear)
    const list = groups.get(year)
    if (list) list.push(meet)
    else groups.set(year, [meet])
  }
  return [...groups].map(([year, meets]) => ({ year, meets }))
})

useSeoMeta({
  title: () => t("meets.title"),
  description: () => t("meets.lede"),
  ogTitle: () => t("meets.title"),
  ogDescription: () => t("meets.lede"),
})
</script>

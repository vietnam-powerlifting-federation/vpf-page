<template>
  <section aria-labelledby="past-title" class="grid gap-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="past-title" class="font-display text-[1.75rem] font-bold uppercase">{{ $t("meets.past") }}</h2>
      <span class="text-sm text-muted-color">{{ $t("meets.pastCount", meets.length) }}</span>
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

<script setup lang="ts">
import { MEET_TYPE_LABEL_KEY, formatDate } from "~/lib/domain/format"
import { groupMeetsByYear } from "~/lib/domain/meet-formatters"
import type { MeetPublic } from "~/types/meets"

/** Finished competitions, newest first, grouped by the year they were held. */
const props = defineProps<{ meets: MeetPublic[] }>()

const { locale } = useI18n()
const byYear = computed(() => groupMeetsByYear(props.meets))
</script>

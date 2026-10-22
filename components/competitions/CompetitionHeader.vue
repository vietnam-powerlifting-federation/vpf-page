<template>
  <PageHeader :kicker="meet?.type ? $t(MEET_TYPE_LABEL_KEY[meet.type]) : $t('meets.kicker')" :title="meet?.meetName ?? ''" compact>
    <template #meta>
      <dl v-if="meet" class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-board-ink-2">
        <div v-if="meet.hostDate" class="flex items-center gap-2">
          <dt><AppIcon name="lucide:calendar" class="size-4" /><span class="sr-only">{{ $t("meets.date") }}</span></dt>
          <dd class="text-board-ink">{{ formatDate(meet.hostDate, locale, "long") }}</dd>
        </div>
        <div v-if="meet.city" class="flex items-center gap-2">
          <dt><AppIcon name="lucide:map-pin" class="size-4" /><span class="sr-only">{{ $t("meets.location") }}</span></dt>
          <dd class="text-board-ink">{{ meet.city }}</dd>
        </div>
        <div class="flex items-center gap-2">
          <dt>{{ $t("general.season") }}</dt>
          <dd class="text-board-ink tabular-nums">{{ meet.systemYear }}</dd>
        </div>
      </dl>
    </template>
    <template v-if="meet && state !== 'closed'" #actions>
      <NuxtLinkLocale
        v-if="state === 'open'"
        :to="`/competitions/${meet.meetSlug}/register`"
        class="inline-flex min-h-11 items-center gap-2 rounded bg-accent-fill px-5 font-display text-base font-bold tracking-[0.05em] text-on-accent uppercase no-underline transition-colors duration-120 ease-snap hover:bg-accent-fill-hover"
      >
        <AppIcon name="lucide:user-plus" class="size-5" />
        {{ $t("meets.registerNow") }}
      </NuxtLinkLocale>
      <p v-else class="font-semibold text-board-ink">
        {{ $t("meets.registrationOpens", { date: formatDate(meet.startRegistration, locale, "long") }) }}
      </p>
      <p v-if="state === 'open'" class="flex items-center text-sm text-board-ink-2">
        {{ $t("meets.registrationCloses", { date: formatDate(meet.closeRegistration, locale, "long") }) }}
      </p>
    </template>
  </PageHeader>
</template>

<script setup lang="ts">
import { getRegistrationState } from "~/lib/domain/competition-eligibility"
import { MEET_TYPE_LABEL_KEY, formatDate } from "~/lib/domain/format"
import type { MeetPublic } from "~/types/meets"

/** A competition's title band: name, type, date, place, season, and Register while entries are open. */
const props = defineProps<{ meet: MeetPublic | null }>()
const { locale } = useI18n()
const state = computed(() => (props.meet ? getRegistrationState(props.meet) : "closed"))
</script>

<template>
  <article class="flex min-w-0 flex-col overflow-hidden rounded-md border border-surface-200 bg-surface-0">
    <img
      v-if="meet.mediaLink"
      :src="meet.mediaLink"
      alt=""
      width="640"
      height="360"
      loading="lazy"
      decoding="async"
      class="aspect-video w-full bg-surface-100 object-cover"
    >
    <div class="flex flex-1 flex-col gap-4 p-4 md:p-5" :class="!meet.mediaLink && 'border-t-[3px] border-t-accent-fill'">
      <div>
        <p class="font-display text-[0.8125rem] font-bold tracking-[0.08em] text-muted-color uppercase">
          {{ meet.type ? $t(MEET_TYPE_LABEL_KEY[meet.type]) : "" }}
        </p>
        <h3 class="font-display text-2xl leading-tight font-bold">
          <NuxtLinkLocale :to="`/competitions/${meet.meetSlug}`" class="decoration-accent decoration-2 underline-offset-3 hover:underline">
            {{ meet.meetName }}
          </NuxtLinkLocale>
        </h3>
      </div>
      <dl class="grid gap-1.5 text-sm">
        <div v-if="meet.hostDate" class="flex items-center gap-2">
          <dt><AppIcon name="lucide:calendar" class="size-4 text-muted-color" /><span class="sr-only">{{ $t("meets.date") }}</span></dt>
          <dd>{{ formatDate(meet.hostDate, locale, "long") }}</dd>
        </div>
        <div v-if="meet.city" class="flex items-center gap-2">
          <dt><AppIcon name="lucide:map-pin" class="size-4 text-muted-color" /><span class="sr-only">{{ $t("meets.location") }}</span></dt>
          <dd>{{ meet.city }}</dd>
        </div>
        <div class="flex items-center gap-2 font-semibold">
          <dt><AppIcon name="lucide:clock" class="size-4 text-muted-color" /><span class="sr-only">{{ $t("meets.endRegistrationDate") }}</span></dt>
          <dd v-if="state === 'open'">{{ $t("meets.registrationCloses", { date: formatDate(meet.closeRegistration, locale, "long") }) }}</dd>
          <dd v-else-if="state === 'upcoming'">{{ $t("meets.registrationOpens", { date: formatDate(meet.startRegistration, locale, "long") }) }}</dd>
          <dd v-else>{{ $t("meets.registrationClosed") }}</dd>
        </div>
      </dl>
      <div v-if="state === 'open'" class="mt-auto flex flex-wrap gap-2">
        <AppButton :to="`/competitions/${meet.meetSlug}/register`">{{ $t("meets.registerNow") }}</AppButton>
        <AppButton v-if="meet.allowSpotterRegistration" variant="secondary" :to="`/competitions/${meet.meetSlug}`">
          {{ $t("meets.registerAsSpotter") }}
        </AppButton>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { getRegistrationState } from "~/lib/domain/competition-eligibility"
import { MEET_TYPE_LABEL_KEY, formatDate } from "~/lib/domain/format"
import type { MeetPublic } from "~/types/meets"

/** An upcoming competition: date, place, registration deadline and the Register button. */
const props = defineProps<{ meet: MeetPublic }>()
const { locale } = useI18n()
const state = computed(() => getRegistrationState(props.meet))
</script>

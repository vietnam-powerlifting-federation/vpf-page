<template>
  <template v-if="meet">
    <div class="mb-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-4 text">
        {{ meet.meetName }}
      </h1>
      <div class="flex flex-wrap gap-4 text-sm text-surface-600">
        <span v-if="meet.hostDate">
          <strong>{{ $t("meets.date") }}:</strong> {{ formatMeetDate(meet.hostDate) }}
        </span>
        <span v-if="meet.city">
          <strong>{{ $t("meets.location") }}:</strong> {{ meet.city }}
        </span>
        <span v-if="meet.type">
          <strong>{{ $t("meets.type") }}:</strong> {{ formatMeetType(meet.type) }}
        </span>
        <span v-if="meet.systemYear">
          <strong>{{ $t("meets.year") }}:</strong> {{ meet.systemYear }}
        </span>
      </div>
    </div>

    <div class="flex relative bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 mb-6">
      <NuxtLinkLocale
        :to="scoresheetPath"
        :class="tabClass('scoresheet')"
      >
        {{ $t("meets.scoresheet") }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        :to="detailedPath"
        :class="tabClass('detailed')"
      >
        {{ $t("meets.detailedScoresheet") }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        :to="glRankingPath"
        :class="tabClass('gl-ranking')"
      >
        {{ $t("meets.athleteRankedByGlPoint") }}
      </NuxtLinkLocale>
    </div>
  </template>

  <slot />
</template>

<script setup lang="ts">
import type { MeetType } from "~/types/union-types"
import type { MeetDataPayload } from "~/types/meets"
import type { ApiResponse } from "~/types/api"
import { formatMeetDate } from "~/lib/utils/meet-formatters"

const props = defineProps<{
  slug: string
}>()

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()

const currentSlug = computed(() => route.params.slug as string)
const nuxtApp = useNuxtApp()

const meet = computed(() => {
  const payload = nuxtApp.payload.data[`meet-data-${currentSlug.value}`] as ApiResponse<MeetDataPayload> | null | undefined
  return payload?.data?.meet ?? null
})

const scoresheetPath = computed(() => localePath(`/openvpf/competitions/${props.slug}`))
const detailedPath = computed(() => localePath(`/openvpf/competitions/${props.slug}/detailed`))
const glRankingPath = computed(() => localePath(`/openvpf/competitions/${props.slug}/gl-ranking`))

const activeTab = computed(() => {
  const path = route.path
  const slugSegment = props.slug
  if (path.endsWith("/gl-ranking") || path.includes(`/${slugSegment}/gl-ranking`)) return "gl-ranking"
  if (path.endsWith("/detailed") || path.includes(`/${slugSegment}/detailed`)) return "detailed"
  return "scoresheet"
})

const tabClass = (tab: string): string => {
  const base =
    "flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-4 px-[1.125rem] font-semibold transition-colors duration-200 -mb-px focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary"
  const active = "border-b-2 border-primary text-primary"
  const inactive =
    "border-b border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-0"
  return activeTab.value === tab ? `${base} ${active}` : `${base} ${inactive}`
}

const formatMeetType = (type: MeetType | null): string => {
  if (!type) return "-"
  const keyMap: Record<MeetType, string> = {
    national: "general.meetTypeNational",
    amateur: "general.meetTypeAmateur",
    professional: "general.meetTypeProfessional",
    national_qualifier: "general.meetTypeNationalQualifier",
    other: "general.meetTypeOther",
  }
  return t(keyMap[type] || "meets.type")
}
</script>

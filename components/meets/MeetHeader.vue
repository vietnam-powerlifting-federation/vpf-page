<template>
  <div>
    <!-- Meet Header -->
    <div class="mb-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-4 text">{{ meet.meetName }}</h1>
      <div class="flex flex-wrap gap-4 text-sm text-surface-600">
        <span v-if="meet.hostDate">
          <strong>{{ $t("meets.date") }}:</strong> {{ formatDate(meet.hostDate) }}
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

    <!-- Tabs Navigation -->
    <div class="flex relative bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
      <NuxtLink
        :to="`/meets/${slug}`"
        :class="getTabClass('scoresheet')"
      >
        {{ $t("meets.scoresheet") }}
      </NuxtLink>
      <NuxtLink
        :to="`/meets/${slug}/detailed`"
        :class="getTabClass('detailed')"
      >
        {{ $t("meets.detailedScoresheet") }}
      </NuxtLink>
      <NuxtLink
        :to="`/meets/${slug}/gl-ranking`"
        :class="getTabClass('gl-ranking')"
      >
        {{ $t("meets.athleteRankedByGlPoint") }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MeetPublic } from "~/types/meets"
import type { MeetType } from "~/types/union-types"

interface Props {
  meet: MeetPublic
  slug: string
  activeTab: string
}

const props = defineProps<Props>()

const formatDate = (date: string | null): string => {
  if (!date) return "-"
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  } catch {
    return date
  }
}

const { t } = useI18n()

const formatMeetType = (type: MeetType | null): string => {
  if (!type) return "-"
  const keyMap: Record<MeetType, string> = {
    national: "general.meetTypeNational",
    amateur: "general.meetTypeAmateur",
    professional: "general.meetTypeProfessional",
    national_qualifier: "general.meetTypeNationalQualifier",
    other: "general.meetTypeOther"
  }
  return t(keyMap[type] || "meets.type")
}

const getTabClass = (tabValue: string): string => {
  const baseClass = "flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-4 px-[1.125rem] font-semibold transition-colors duration-200 -mb-px focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary"
  
  if (tabValue === props.activeTab) {
    return `${baseClass} border-b-2 border-primary text-primary`
  }
  return `${baseClass} border-b border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-0`
}
</script>


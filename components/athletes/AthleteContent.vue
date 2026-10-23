<template>
  <PageSection class="grid gap-10">
    <LazyBannerSlideshow v-if="banners.length" :banners="banners" />
    <p v-if="vip?.displayProfileDescription && vip.profileDescription" class="max-w-prose text-lg whitespace-pre-line">
      {{ vip.profileDescription }}
    </p>
    <AthletePbs :personal-best="profile.personalBest" :comp-history="profile.compHistory" />
    <AthleteRecords
      v-if="profile.records.length"
      :records="profile.records"
      :comp-history="profile.compHistory"
      :meets="profile.meets"
      :athlete="profile.athlete"
      :can-attach="isOwner && !!vip"
    />
    <AthleteHistory :comp-history="profile.compHistory" :meets="profile.meets" :name="profile.athlete.fullName" />
  </PageSection>
</template>

<script setup lang="ts">
import type { AthleteProfileData } from "~/types/users"

/** The body of an athlete's page: banners, description, personal bests, records and competition history. */
const props = defineProps<{
  profile: AthleteProfileData
  banners: string[]
  isOwner: boolean
}>()

const vip = computed(() => props.profile.vipSettings)
</script>

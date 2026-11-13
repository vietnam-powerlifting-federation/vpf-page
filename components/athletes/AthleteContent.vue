<template>
  <PageSection class="grid grid-cols-1 gap-10">
    <AthletePbs :personal-best="profile.personalBest" :comp-history="profile.compHistory" />
    <AthleteHistory :comp-history="profile.compHistory" :meets="profile.meets" :name="profile.athlete.fullName" />
    <AthleteRecords
      v-if="profile.records.length"
      :records="profile.records"
      :comp-history="profile.compHistory"
      :meets="profile.meets"
      :athlete="profile.athlete"
      :can-attach="isOwner && !!vip"
    />
  </PageSection>
</template>

<script setup lang="ts">
import type { AthleteProfileData } from "~/types/users"

/** The body of an athlete's page: personal bests, competition history and records. */
const props = defineProps<{
  profile: AthleteProfileData
  isOwner: boolean
}>()

const vip = computed(() => props.profile.vipSettings)
</script>

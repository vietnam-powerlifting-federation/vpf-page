<template>
  <div>
    <div v-if="pending" class="flex justify-center items-center min-h-screen">
      <ProgressSpinner />
    </div>

    <div v-else-if="error || !data?.data" class="flex justify-center items-center min-h-screen">
      <p class="text-error text-lg">{{ $t("athlete.notFound") }}</p>
    </div>

    <VipProfile
      v-else-if="data.data.vipSettings"
      :athlete="data.data.athlete"
      :vip-settings="data.data.vipSettings"
      :personal-best="data.data.personalBest"
      :comp-history="data.data.compHistory"
      :meets="data.data.meets"
      :records="data.data.records ?? []"
    />

    <NormalProfile
      v-else
      :athlete="data.data.athlete"
      :personal-best="data.data.personalBest"
      :comp-history="data.data.compHistory"
      :meets="data.data.meets"
      :records="data.data.records ?? []"
    />
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import NormalProfile from "~/components/athletes/NormalProfile.vue"
import VipProfile from "~/components/athletes/VipProfile.vue"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"
import type { PersonalBestSummary, Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"

const route = useRoute()

const { data, pending, error } = await useFetch<{
  success: boolean
  data: {
    athlete: UserPublic
    personalBest: PersonalBestSummary
    compHistory: Result[]
    meets: MeetPublic[]
    records?: LiftRecord[]
    vipSettings?: VipBenefits
  } | null
  message: { en: string; vi: string }
}>(`/api/athletes/${route.params.slug}`, {
  query: { includeVipSettings: "true", includeRecords: "true" },
})
</script>

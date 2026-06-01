<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-primary">
          {{ athlete.fullName }}{{ sexLabel ? ` (${sexLabel})` : "" }}
        </h1>

        <div class="mb-10">
          <AthletePbs :personal-best="personalBest" :comp-history="compHistory" />
        </div>

        <div class="mb-10">
          <AthleteCompHistory :comp-history="compHistory" :meets="meets" />
        </div>

        <div v-if="records.length > 0">
          <AthleteRecords :records="records" :comp-history="compHistory" :meets="meets" :athlete="athlete" :show-certificate="true" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import AthletePbs from "~/components/athletes/AthletePbs.vue"
import AthleteCompHistory from "~/components/athletes/AthleteCompHistory.vue"
import AthleteRecords from "~/components/athletes/AthleteRecords.vue"
import type { UserPublic } from "~/types/users"
import type { PersonalBestSummary, Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"

const props = defineProps<{
  athlete: UserPublic
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  records: LiftRecord[]
}>()

const sexLabel = computed(() => {
  const sex = props.compHistory[0]?.sex
  if (!sex) return null
  return sex === "male" ? "M" : "F"
})
</script>

<template>
  <div>
    <div v-if="pending" class="flex justify-center items-center min-h-screen">
      <ProgressSpinner />
    </div>

    <div v-else-if="error || !profile" class="flex justify-center items-center min-h-screen">
      <p class="text-error text-lg">{{ $t("athlete.notFound") }}</p>
    </div>

    <VipProfile
      v-else-if="profile.vipSettings"
      :athlete="profile.athlete"
      :vip-settings="profile.vipSettings"
      :personal-best="profile.personalBest"
      :comp-history="profile.compHistory"
      :meets="profile.meets"
      :records="profile.records"
    />

    <NormalProfile
      v-else
      :athlete="profile.athlete"
      :personal-best="profile.personalBest"
      :comp-history="profile.compHistory"
      :meets="profile.meets"
      :records="profile.records"
    />
  </div>
</template>

<script setup lang="ts">
import NormalProfile from "~/components/athletes/NormalProfile.vue"
import VipProfile from "~/components/athletes/VipProfile.vue"
import type { ApiResponse } from "~/types/api"
import type { AthleteProfileData } from "~/types/users"

const route = useRoute()

// The /profile route always returns the whole aggregate — the records and VIP
// settings this page needs used to be opt-in through query flags.
const { data, pending, error } = await useFetch<ApiResponse<AthleteProfileData>>(
  `/api/athletes/${route.params.slug}/profile`,
)

const profile = computed(() => (data.value?.success ? data.value.data : null))

definePageMeta({
  layout: "default",
})
</script>

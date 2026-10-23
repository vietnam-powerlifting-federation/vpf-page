<template>
  <div v-if="athletePage.profile">
    <AthleteHeader
      :athlete="athletePage.athlete"
      :vip="athletePage.vip"
      :meta-line="athletePage.metaLine"
      :has-socials="athletePage.hasSocials"
    />
    <AthleteContent :profile="athletePage.profile" :banners="athletePage.banners" :is-owner="athletePage.isOwner" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })

const athletePage = await useAthletePage(useRoute().params.slug as string)

useSeoMeta({
  title: () => athletePage.athlete.fullName,
  description: () => athletePage.metaLine,
  ogTitle: () => athletePage.athlete.fullName,
  ogType: "profile",
})
</script>

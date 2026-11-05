<template>
  <div v-if="athletePage.profile">
    <AthleteVipHero
      v-if="athletePage.vip"
      :full-name="athletePage.athlete.fullName"
      :vip="athletePage.vip"
      :avatar="athletePage.vip.avatarImageUrl"
      :banners="athletePage.banners"
      :meta-line="athletePage.metaLine"
    />
    <AthleteHeader v-else :athlete="athletePage.athlete" :meta-line="athletePage.metaLine" />
    <AthleteContent :profile="athletePage.profile" :is-owner="athletePage.isOwner" />
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

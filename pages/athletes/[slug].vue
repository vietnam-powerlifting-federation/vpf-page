<template>
  <div v-if="athletePage.profile">
    <AthleteVipHero
      v-if="athletePage.vip"
      :full-name="athletePage.displayName"
      :vip="athletePage.vip"
      :avatar="athletePage.vip.avatarImageUrl"
      :banners="athletePage.banners"
    />
    <AthleteHeader v-else :name="athletePage.displayName" />
    <AthleteContent :profile="athletePage.profile" :is-owner="athletePage.isOwner" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" })

const athletePage = await useAthletePage(useRoute().params.slug as string)

useSeoMeta({
  title: () => athletePage.athlete.fullName,
  description: () => athletePage.displayName,
  ogTitle: () => athletePage.athlete.fullName,
  ogType: "profile",
})
</script>

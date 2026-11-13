<template>
  <PageHeader :kicker="$t('athlete.kicker')" :title="name" compact />
</template>

<script setup lang="ts">
/** The title band of a regular athlete's page: the name and category. VIP athletes get AthleteVipHero instead. */
defineProps<{ name: string }>()
</script>

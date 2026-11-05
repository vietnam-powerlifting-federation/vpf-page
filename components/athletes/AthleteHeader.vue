<template>
  <PageHeader :kicker="$t('athlete.kicker')" :title="athlete.fullName" compact>
    <template #lede>
      <span class="tabular-nums">{{ metaLine }}</span>
    </template>
  </PageHeader>
</template>

<script setup lang="ts">
import type { UserPublic } from "~/types/users"

/** The title band of a regular athlete's page: name and meta line. VIP athletes get AthleteVipHero instead. */
defineProps<{
  athlete: UserPublic
  metaLine: string
}>()
</script>

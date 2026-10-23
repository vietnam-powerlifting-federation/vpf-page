<template>
  <PageHeader :kicker="$t('athlete.kicker')" compact>
    <template #title>
      <span :style="nameDecoratorStyle(vip?.decorator1, vip?.decorator2, 'board')">{{ athlete.fullName }}</span>
    </template>
    <template #lede>
      <span v-if="vip?.displayAlias && vip.alias" class="mb-1 block text-board-ink">“{{ vip.alias }}”</span>
      <span class="tabular-nums">{{ metaLine }}</span>
    </template>
    <template v-if="vip && (vip.avatarImageUrl || hasSocials)" #aside>
      <div class="flex flex-wrap items-center gap-4 lg:flex-col lg:items-end">
        <AthleteAvatar
          v-if="vip.avatarImageUrl"
          :src="vip.avatarImageUrl"
          :alt="$t('athlete.avatarAlt', { name: athlete.fullName })"
          :decorator1="vip.decorator1"
          :decorator2="vip.decorator2"
          class="size-28 sm:size-36 lg:size-44"
        />
        <SocialLinks :vip-settings="vip" :label="$t('athlete.social.label', { name: athlete.fullName })" on-board />
      </div>
    </template>
  </PageHeader>
</template>

<script setup lang="ts">
import { nameDecoratorStyle } from "~/lib/domain/format"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

/** The title band of an athlete's page: name in their VIP colours, alias, meta line, avatar and socials. */
defineProps<{
  athlete: UserPublic
  vip: VipBenefits | null
  metaLine: string
  hasSocials: boolean
}>()
</script>

<template>
  <PagePanel :title="$t('profile.tabs.vipBenefits')" ruled>
    <template v-if="membership.isAdmin" #actions>
      <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-color">
        <ToggleSwitch :model-value="membership.previewInverted" @update:model-value="membership.setPreviewInverted" />
        {{ membership.active ? $t("profile.vipBenefits.previewNonVip") : $t("profile.vipBenefits.previewActive") }}
      </label>
    </template>

    <LoadingState v-if="membership.pending" />

    <div v-else class="grid gap-6">
      <VipMembershipCard
        v-if="membership.showActive || membership.expiresAt"
        :expires-at="membership.expiresAt"
        :active="membership.showActive"
        @renew="membership.goToCheckout"
      />

      <!-- Upsell for athletes without an active membership -->
      <div v-if="!membership.showActive" class="grid gap-3 rounded-md border border-surface-200 border-l-[3px] border-l-accent-fill bg-surface-50 p-5">
        <h3 class="flex items-center gap-2 font-display text-xl font-bold uppercase">
          <AppIcon name="lucide:star" class="size-5 text-accent" />
          {{ $t("profile.vipBenefits.upsellTitle") }}
        </h3>
        <p>{{ $t("profile.vipBenefits.description") }}</p>
        <ul class="grid gap-1 text-sm">
          <li v-for="feature in upsellFeatures" :key="feature" class="flex items-start gap-2">
            <AppIcon name="lucide:check" class="mt-0.5 size-4 text-success" />
            <span>{{ $t(feature) }}</span>
          </li>
        </ul>
        <p class="text-sm text-muted-color">{{ $t("profile.vipBenefits.upsellTryIt") }}</p>
        <Button class="justify-self-start" @click="membership.goToCheckout">
          <AppIcon name="lucide:star" class="size-4" />
          {{ $t("profile.vipBenefits.registerNow") }} · {{ membership.formattedPrice }}
        </Button>
      </div>
    </div>
  </PagePanel>
</template>

<script setup lang="ts">
import type { useVipMembership } from "~/composables/useVipMembership"

/** The athlete's VIP membership: its card with expiry and renewal, or an upsell with the price. */
defineProps<{ membership: ReturnType<typeof useVipMembership> }>()

const upsellFeatures = [
  "profile.vipBenefits.featureBanners",
  "profile.vipBenefits.featureNameColor",
  "profile.vipBenefits.featureSocials",
  "profile.vipBenefits.featureBio",
]
</script>

<template>
  <div class="grid gap-6">
    <VipMembershipPanel :membership="vip.membership" />
    <template v-if="!vip.membership.pending">
      <VipPreviewPanel :membership="vip.membership" :settings="vip.settings" />
      <VipSettingsPanel :membership="vip.membership" :settings="vip.settings" />
    </template>
    <VipUnsavedPrompt :settings="vip.settings" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "account", middleware: "auth" })
usePageTitle("profile.tabs.vipBenefits")

const vip = useVipPage()
</script>

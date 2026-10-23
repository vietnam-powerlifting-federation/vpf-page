<template>
  <VoucherPanel />
</template>

<script setup lang="ts">
definePageMeta({ layout: "account", middleware: "auth" })
usePageTitle("profile.tabs.voucher")
</script>

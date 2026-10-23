<template>
  <ChangePasswordPanel />
</template>

<script setup lang="ts">
definePageMeta({ layout: "account", middleware: "auth" })
usePageTitle("profile.tabs.changePassword")
</script>

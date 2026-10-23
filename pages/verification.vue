<template>
  <IdentityVerificationCard />
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth", wide: true })
usePageTitle("verification.title")
</script>

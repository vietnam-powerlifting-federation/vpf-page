<template>
  <VerifyEmailCard />
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" })
usePageTitle("verifyEmail.title")
</script>

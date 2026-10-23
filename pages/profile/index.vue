<template>
  <div class="grid gap-6">
    <IdentityStatusPanel />
    <PersonalInfoForm />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "account", middleware: "auth" })
usePageTitle("profile.tabs.personalInfo")
</script>

<template>
  <AdminViolationsScreen />
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
usePageTitle("admin.violations.title")
</script>

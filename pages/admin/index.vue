<template>
  <AdminDashboardScreen />
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
usePageTitle("admin.dashboard.title")
</script>

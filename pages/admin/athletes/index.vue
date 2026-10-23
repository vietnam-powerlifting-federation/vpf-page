<template>
  <AdminAthletesScreen />
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
usePageTitle("admin.athletes.title")
</script>

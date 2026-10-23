<template>
  <AdminEntriesScreen />
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
usePageTitle("admin.entries.title")
</script>

<template>
  <span>{{ formatKg(value, locale) }}</span>
</template>

<script setup lang="ts">
import { formatKg } from "~/lib/domain/format"

defineProps<{ value: number | null | undefined }>()
const { locale } = useI18n()
</script>

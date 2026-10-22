<template>
  <span class="font-display text-xl font-bold">{{ formatGl(value, locale) }}</span>
</template>

<script setup lang="ts">
import { formatGl } from "~/lib/domain/format"

defineProps<{ value: number | null | undefined }>()
const { locale } = useI18n()
</script>

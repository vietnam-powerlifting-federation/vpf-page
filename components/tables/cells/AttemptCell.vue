<template>
  <span v-if="!value" class="text-muted-color">
    <span aria-hidden="true">–</span>
    <span class="sr-only">{{ $t("tables.notAttempted") }}</span>
  </span>
  <s v-else-if="value < 0" class="text-danger">
    {{ formatKg(-value, locale) }}
    <span class="sr-only">{{ $t("tables.noLift") }}</span>
  </s>
  <span v-else>{{ formatKg(value, locale) }}</span>
</template>

<script setup lang="ts">
import { formatKg } from "~/lib/domain/format"

/**
 * One attempt. Results store a missed attempt as a negative weight and an
 * attempt not taken as 0 or null. A good lift is plain; a missed one is red
 * and struck through, so colour is not the only signal.
 */
defineProps<{ value: number | null | undefined }>()
const { locale } = useI18n()
</script>

<template>
  <span v-if="!value" class="text-muted-color">
    <span aria-hidden="true">–</span>
    <span class="sr-only">{{ $t("tables.notAttempted") }}</span>
  </span>
  <span v-else-if="value < 0" class="inline-flex items-center justify-end gap-1 text-danger">
    <AppIcon name="lucide:x" class="size-3.5" />
    <s>{{ formatKg(-value, locale) }}</s>
    <span class="sr-only">{{ $t("tables.noLift") }}</span>
  </span>
  <span v-else class="inline-flex items-center justify-end gap-1" :class="best && 'text-accent'">
    <AppIcon name="lucide:check" class="size-3.5 text-success" />
    {{ formatKg(value, locale) }}
    <span class="sr-only">{{ $t("tables.goodLift") }}</span>
  </span>
</template>

<script setup lang="ts">
import { formatKg } from "~/lib/domain/format"

/**
 * One attempt. Results store a missed attempt as a negative weight and an
 * attempt not taken as 0 or null. Good and no lift differ by icon and
 * strike-through, not by colour alone.
 */
defineProps<{ value: number | null | undefined; best?: boolean }>()
const { locale } = useI18n()
</script>

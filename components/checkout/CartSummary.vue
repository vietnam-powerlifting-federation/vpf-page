<template>
  <dl class="grid gap-2 text-sm">
    <div v-for="line in lines" :key="line.key" class="flex justify-between gap-4" :class="line.discount && 'text-success'">
      <dt :class="!line.discount && 'text-muted-color'">{{ line.label }}</dt>
      <dd class="font-semibold whitespace-nowrap tabular-nums">{{ line.discount ? "−" : "" }}{{ formatVnd(line.amount, locale) }}</dd>
    </div>
    <div class="mt-2 flex items-baseline justify-between gap-4 border-t border-surface-200 pt-3">
      <dt class="font-display text-base font-bold tracking-[0.06em] uppercase">{{ $t("checkout.total") }}</dt>
      <dd class="font-display text-3xl font-bold whitespace-nowrap tabular-nums">{{ formatVnd(total, locale) }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"

/** Fees, discounts and the amount to pay. */
defineProps<{
  lines: { key: string; label: string; amount: number; discount?: boolean }[]
  total: number
}>()
const { locale } = useI18n()
</script>

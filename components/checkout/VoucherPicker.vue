<template>
  <AppField v-slot="f" :label="`${$t('voucher.apply')} · ${typeLabel(type)}`" :hint="available.length ? undefined : $t('voucher.noneAvailable')">
    <Select
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :placeholder="$t('voucher.none')"
      :disabled="!available.length"
      :aria-labelledby="f.labelId"
      :aria-describedby="f.describedBy"
      show-clear
      class="w-full"
      @update:model-value="emit('update:modelValue', $event ?? null)"
    />
  </AppField>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"
import type { PurchaseType } from "~/types/union-types"
import type { Voucher } from "~/types/vouchers"

/**
 * Picks at most one voucher for a single line item. The parent owns the selection
 * and recomputes the total with `computeVoucherTotals`, so this stays presentational.
 */
const { type, vouchers, modelValue } = defineProps<{
  type: PurchaseType
  /** The athlete's vouchers; filtered to this type here. */
  vouchers: Voucher[]
  /** Selected voucher code, or null for none. */
  modelValue: string | null
}>()

const emit = defineEmits<{ "update:modelValue": [string | null] }>()

const { t } = useI18n()
const { typeLabel, formatDiscount } = useVoucherDisplay()

const available = computed(() => vouchers.filter((v) => v.type === type && v.status === "active"))

const options = computed(() =>
  available.value.map((v) => ({
    value: v.code,
    label: `${formatDiscount(v)} — ${t("voucher.expiresOn", { date: formatDateDMY(v.expiresAt) })}`,
  })),
)
</script>

<template>
  <!-- Order, voucher and total -->
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <PagePanel :title="$t('checkout.itemsTitle')" ruled>
      <p v-if="checkout.items.length === 0" class="py-6 text-center text-muted-color">{{ $t("checkout.emptyCart") }}</p>
      <ul v-else class="grid">
        <li v-for="item in checkout.items" :key="item.plan" class="flex items-baseline justify-between gap-4 border-b border-surface-200 py-3 last:border-b-0">
          <span class="font-semibold">{{ item.name[locale as "en" | "vi"] ?? item.name.en }}</span>
          <span class="font-display text-xl font-bold whitespace-nowrap tabular-nums">{{ formatVnd(item.amount, locale) }}</span>
        </li>
      </ul>
    </PagePanel>

    <PagePanel :title="$t('checkout.totalTitle')" class="lg:sticky lg:top-20">
      <div class="grid gap-5">
        <VoucherPicker
          v-if="checkout.voucherType && checkout.items.length"
          :model-value="checkout.selectedVoucherCode"
          :type="checkout.voucherType"
          :vouchers="checkout.vouchers"
          @update:model-value="checkout.selectVoucher"
        />
        <CartSummary :lines="checkout.summaryLines" :total="checkout.total" />
        <div class="grid gap-2">
          <Button :label="$t('checkout.confirmButton')" :loading="checkout.isCreating" :disabled="checkout.items.length === 0" class="w-full" @click="checkout.confirm" />
          <Button :label="$t('checkout.backButton')" severity="secondary" variant="text" class="w-full" @click="checkout.back" />
        </div>
      </div>
    </PagePanel>
  </div>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"
import type { useCheckoutPage } from "~/composables/useCheckoutPage"

/** The first checkout step: what is being bought, an optional voucher, the total, and the confirm button. */
defineProps<{ checkout: ReturnType<typeof useCheckoutPage> }>()

const { locale } = useI18n()
</script>

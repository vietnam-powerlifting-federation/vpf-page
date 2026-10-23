<template>
  <StepIndicator :steps="checkout.stepLabels" :current="checkout.stepIndex" :label="$t('steps.progress')" />

  <CheckoutReview v-if="checkout.step === 'initial'" :checkout="checkout" />

  <!-- Bank-transfer QR -->
  <PagePanel v-else-if="checkout.step === 'pending' && checkout.purchase?.qrUrl" ruled>
    <QrPayment
      :ref-code="checkout.purchase.refCode"
      :amount="checkout.purchase.amount"
      :qr-url="checkout.purchase.qrUrl"
      @paid="checkout.done"
      @cancelled="checkout.cancel"
    />
  </PagePanel>

  <!-- A voucher covered the whole amount, so the purchase is already active -->
  <PagePanel v-else-if="checkout.step === 'free'" ruled class="max-w-xl">
    <div class="grid justify-items-start gap-3">
      <AppIcon name="lucide:circle-check" class="size-10 text-success" />
      <h2 class="font-display text-2xl font-bold uppercase">{{ $t("checkout.freeTitle") }}</h2>
      <p>{{ $t("checkout.freeBody") }}</p>
      <Button :label="$t('checkout.viewBenefits')" @click="checkout.done" />
    </div>
  </PagePanel>

  <PagePanel v-else-if="checkout.step === 'cancelled'" class="max-w-xl">
    <div class="grid justify-items-start gap-3">
      <AppIcon name="lucide:circle-x" class="size-10 text-danger" />
      <p>{{ $t("checkout.cancelled") }}</p>
      <Button :label="$t('checkout.backButton')" severity="secondary" @click="checkout.back" />
    </div>
  </PagePanel>
</template>

<script setup lang="ts">
import type { useCheckoutPage } from "~/composables/useCheckoutPage"

/** The checkout steps: review, bank-transfer QR, fully discounted, or cancelled. */
defineProps<{ checkout: ReturnType<typeof useCheckoutPage> }>()
</script>

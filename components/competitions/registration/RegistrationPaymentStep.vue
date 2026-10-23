<template>
  <!-- Step 5: bank-transfer QR -->
  <div v-if="purchase?.qrUrl" class="grid gap-5">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.stepPayment") }}</h2>
    <QrPayment :ref-code="purchase.refCode" :amount="purchase.amount" :qr-url="purchase.qrUrl" @paid="reg.wizard.goTo('done')" @cancelled="reg.wizard.goTo('review')" />
  </div>
</template>

<script setup lang="ts">
/** Step 5: pay the fees by bank transfer, with a QR code. */
const reg = useRegistration()
const purchase = computed(() => reg.entry.purchase)
</script>

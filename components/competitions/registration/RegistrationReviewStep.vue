<template>
  <!-- Step 4: vouchers, fees and confirm -->
  <div class="grid gap-5">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.reviewLegend") }}</h2>

    <div v-if="reg.entry.voucherTypes.length" class="grid gap-4 rounded-md border border-surface-200 bg-surface-50 p-4">
      <div>
        <h3 class="font-semibold">{{ $t("competitionRegistration.voucherLegend") }}</h3>
        <p class="text-sm text-muted-color">{{ $t("competitionRegistration.voucherHint") }}</p>
      </div>
      <VoucherPicker
        v-for="vt in reg.entry.voucherTypes"
        :key="vt"
        :model-value="reg.entry.selectedVoucherCodes[vt] ?? null"
        :type="vt"
        :vouchers="reg.entry.vouchers"
        @update:model-value="reg.entry.selectVoucher(vt, $event)"
      />
    </div>

    <CartSummary :lines="reg.entry.summaryLines" :total="reg.entry.total" />

    <div class="flex justify-between border-t border-surface-200 pt-4">
      <Button severity="secondary" variant="text" @click="reg.wizard.goTo('details')">
        <AppIcon name="lucide:arrow-left" class="size-4" />
        {{ $t("competitionRegistration.back") }}
      </Button>
      <Button :label="$t('competitionRegistration.confirm')" :loading="reg.entry.isSubmitting" @click="reg.entry.submit" />
    </div>
  </div>
</template>

<script setup lang="ts">
/** Step 4: apply vouchers, review the fees, and confirm the registration. */
const reg = useRegistration()
</script>

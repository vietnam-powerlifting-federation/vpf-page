<template>
  <PagePanel :title="$t('profile.tabs.paymentHistory')" ruled>
    <LoadingState v-if="payments.pending" />
    <Message v-else-if="payments.error" severity="error" :closable="false">{{ $t("general.error") }}</Message>
    <p v-else-if="payments.purchases.length === 0" class="py-6 text-center text-muted-color">{{ $t("profile.paymentHistory.empty") }}</p>
    <ul v-else class="grid gap-3">
      <li
        v-for="purchase in payments.purchases"
        :key="purchase.purchaseId"
        class="flex flex-col gap-3 rounded-md border border-surface-200 p-4 sm:flex-row sm:items-center sm:justify-between"
        :class="purchase.status === 'pending' && 'border-l-[3px] border-l-accent-fill'"
      >
        <div class="min-w-0">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <span class="font-semibold">{{ purchase.type.map((type) => $t(`profile.paymentHistory.type.${type}`)).join(" + ") }}</span>
            <Tag :severity="PURCHASE_STATUS_SEVERITY[purchase.status]" :value="$t(`profile.paymentHistory.status.${purchase.status}`)" />
          </div>
          <p class="font-display text-xl font-bold tabular-nums">{{ formatVnd(purchase.amount, locale) }}</p>
          <p class="text-[0.8125rem] text-muted-color">
            <span class="sr-only">{{ $t("profile.paymentHistory.reference") }}: </span><span class="font-mono">VPF{{ purchase.refCode }}</span> · {{ formatDateTime(purchase.createdAt, locale) }}
          </p>
        </div>
        <Button v-if="purchase.status === 'pending'" class="shrink-0" @click="payments.openQr(purchase)">
          <AppIcon name="lucide:qr-code" class="size-5" />
          {{ $t("profile.paymentHistory.payNow") }}
        </Button>
      </li>
    </ul>

    <Dialog v-model:visible="payments.qrOpen" modal dismissable-mask :header="$t('profile.paymentHistory.qrDialogTitle')" class="w-[min(30rem,94vw)]">
      <QrPayment
        v-if="payments.selected && payments.selected.qrUrl"
        :ref-code="payments.selected.refCode"
        :amount="payments.selected.amount"
        :qr-url="payments.selected.qrUrl"
        @paid="payments.closeQr"
        @cancelled="payments.closeQr"
      />
    </Dialog>
  </PagePanel>
</template>

<script setup lang="ts">
import { formatDateTime, formatVnd } from "~/lib/domain/format"
import { PURCHASE_STATUS_SEVERITY } from "~/lib/domain/purchase-status"

/** The athlete's purchases with their status, and a way to pay a pending one by QR. */
const payments = await usePaymentHistory()
const { locale } = useI18n()
</script>

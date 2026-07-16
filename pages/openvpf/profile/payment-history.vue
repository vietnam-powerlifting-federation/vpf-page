<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.paymentHistory") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="error" class="text-red-400 text-sm">{{ $t("general.error") }}</div>
    <template v-else>
      <div v-if="purchases.length === 0" class="text-surface-400 text-sm py-8 text-center">
        {{ $t("profile.paymentHistory.empty") }}
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="purchase in purchases"
          :key="purchase.purchaseId"
          class="border border-surface-600 rounded-lg p-4 bg-surface-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          :class="purchase.status === 'pending' ? 'cursor-pointer hover:border-primary transition-colors' : ''"
          @click="purchase.status === 'pending' && openQrDialog(purchase)"
        >
          <div class="w-full sm:flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-mono text-sm text-surface-400 break-all sm:break-normal">{{ purchase.type.map((t) => $t(`profile.paymentHistory.type.${t}`)).join(" + ") }} - VPF{{ purchase.refCode }}</span>
              <Tag :severity="statusSeverity(purchase.status)" :value="$t(`profile.paymentHistory.status.${purchase.status}`)" />
            </div>
            <div class="text-surface-0">{{ formatAmount(purchase.amount) }} VND</div>
            <div class="text-surface-500 text-xs mt-1">{{ formatDate(purchase.createdAt) }}</div>
          </div>
          <div v-if="purchase.status === 'pending'" class="text-primary shrink-0 self-end sm:self-auto">
            <i class="pi pi-qrcode text-2xl" />
          </div>
        </div>
      </div>
    </template>

    <Dialog
      v-model:visible="qrDialogVisible"
      modal
      dismissableMask
      :header="$t('profile.paymentHistory.qrDialogTitle')"
      :closable="true"
    >
      <CheckoutQrPayment
        v-if="selectedPurchase && selectedPurchase.qrUrl"
        :ref-code="selectedPurchase.refCode"
        :amount="selectedPurchase.amount"
        :qr-url="selectedPurchase.qrUrl"
        @paid="onPaid"
        @cancelled="onCancelled"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t } = useI18n()
const toast = useToast()

const { data, pending, error, refresh } = await useFetch<ApiResponse<PurchaseStatus[]>>("/api/purchases")

const purchases = computed(() => data.value?.data ?? [])

const qrDialogVisible = ref(false)
const selectedPurchase = ref<PurchaseStatus | null>(null)

function openQrDialog(purchase: PurchaseStatus) {
  selectedPurchase.value = purchase
  qrDialogVisible.value = true
}

function onPaid() {
  qrDialogVisible.value = false
  toast.add({ severity: "success", summary: t("general.success"), detail: t("checkout.paymentSuccess"), life: 5000 })
  refresh()
}

function onCancelled() {
  qrDialogVisible.value = false
  refresh()
}

function formatAmount(amount: number) {
  return amount.toLocaleString("vi-VN")
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

type TagSeverity = "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined

function statusSeverity(status: PurchaseStatus["status"]): TagSeverity {
  const map: Record<PurchaseStatus["status"], TagSeverity> = {
    pending: "warn",
    active: "success",
    expired: "secondary",
    cancelled: "danger",
  }
  return map[status]
}

useHead({
  title: () => t("profile.tabs.paymentHistory"),
})
</script>

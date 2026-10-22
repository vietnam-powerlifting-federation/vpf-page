<template>
  <PagePanel :title="$t('profile.tabs.paymentHistory')" ruled>
    <LoadingState v-if="pending" />
    <Message v-else-if="error" severity="error" :closable="false">{{ $t("general.error") }}</Message>
    <p v-else-if="purchases.length === 0" class="py-6 text-center text-muted-color">{{ $t("profile.paymentHistory.empty") }}</p>
    <ul v-else class="grid gap-3">
      <li
        v-for="purchase in purchases"
        :key="purchase.purchaseId"
        class="flex flex-col gap-3 rounded-md border border-surface-200 p-4 sm:flex-row sm:items-center sm:justify-between"
        :class="purchase.status === 'pending' && 'border-l-[3px] border-l-accent-fill'"
      >
        <div class="min-w-0">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <span class="font-semibold">{{ purchase.type.map((type) => $t(`profile.paymentHistory.type.${type}`)).join(" + ") }}</span>
            <Tag :severity="statusSeverity(purchase.status)" :value="$t(`profile.paymentHistory.status.${purchase.status}`)" />
          </div>
          <p class="font-display text-xl font-bold tabular-nums">{{ formatVnd(purchase.amount, locale) }}</p>
          <p class="text-[0.8125rem] text-muted-color">
            <span class="sr-only">{{ $t("profile.paymentHistory.reference") }}: </span><span class="font-mono">VPF{{ purchase.refCode }}</span> · {{ formatDateTime(purchase.createdAt) }}
          </p>
        </div>
        <Button v-if="purchase.status === 'pending'" class="shrink-0" @click="openQrDialog(purchase)">
          <AppIcon name="lucide:qr-code" class="size-5" />
          {{ $t("profile.paymentHistory.payNow") }}
        </Button>
      </li>
    </ul>

    <Dialog v-model:visible="qrDialogVisible" modal dismissable-mask :header="$t('profile.paymentHistory.qrDialogTitle')" class="w-[min(30rem,94vw)]">
      <QrPayment
        v-if="selectedPurchase && selectedPurchase.qrUrl"
        :ref-code="selectedPurchase.refCode"
        :amount="selectedPurchase.amount"
        :qr-url="selectedPurchase.qrUrl"
        @paid="onPaid"
        @cancelled="onCancelled"
      />
    </Dialog>
  </PagePanel>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

definePageMeta({
  layout: "account",
  middleware: "auth",
})

const { t, locale } = useI18n()

const { data, pending, error, refresh } = await useFetch<ApiResponse<PurchaseStatus[]>>("/api/athletes/me/purchases")

const purchases = computed(() => data.value?.data ?? [])

const qrDialogVisible = ref(false)
const selectedPurchase = ref<PurchaseStatus | null>(null)

function openQrDialog(purchase: PurchaseStatus) {
  selectedPurchase.value = purchase
  qrDialogVisible.value = true
}

// QrPayment announces the payment itself.
function onPaid() {
  qrDialogVisible.value = false
  refresh()
}

function onCancelled() {
  qrDialogVisible.value = false
  refresh()
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(locale.value === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" })
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

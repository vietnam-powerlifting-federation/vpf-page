<template>
  <div class="space-y-5 max-w-md">
    <p class="text-surface-300 text-sm">{{ $t("checkout.scanQr") }}</p>

    <div class="bg-surface-800 rounded-lg p-4 space-y-3 text-sm">
      <div class="flex justify-between">
        <span class="text-surface-400">{{ $t("checkout.amount") }}</span>
        <span class="font-semibold text-surface-0">{{ formatAmount(amount) }} VND</span>
      </div>
      <div class="flex justify-between">
        <span class="text-surface-400">{{ $t("checkout.transferNote") }}</span>
        <span class="font-mono font-bold text-primary">VPF{{ refCode }}</span>
      </div>
    </div>

    <div class="flex justify-center">
      <img
        :src="qrUrl"
        :alt="$t('checkout.qrAlt')"
        class="w-64 h-64 rounded-lg bg-white"
      >
    </div>

    <div class="flex items-center gap-2 justify-center text-surface-400 text-sm">
      <ProgressSpinner style="width: 16px; height: 16px;" class="!mx-0" stroke-width="4" />
      <span>{{ $t("checkout.waitingForPayment") }}</span>
    </div>

    <div class="flex justify-center pt-1">
      <Button
        :label="$t('checkout.cancelButton')"
        severity="danger"
        text
        size="small"
        :loading="isCancelling"
        @click="handleCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useToast } from "primevue/usetoast"
import Button from "@/components/volt/Button.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

const { refCode, amount, qrUrl } = defineProps<{
  refCode: string
  amount: number
  qrUrl: string
}>()

const emit = defineEmits<{
  paid: []
  cancelled: []
}>()

const POLL_INTERVAL_MS = 3_000

const { t } = useI18n()
const toast = useToast()

const isCancelling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatAmount(value: number) {
  return value.toLocaleString("vi-VN")
}

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await $fetch<ApiResponse<PurchaseStatus>>(`/api/purchases/${refCode}` as string)
      if (!res.success || !res.data) return

      if (res.data.status === "active") {
        stopPolling()
        toast.add({ severity: "success", summary: t("general.success"), detail: t("checkout.paymentSuccess"), life: 5000 })
        emit("paid")
      } else if (res.data.status === "cancelled") {
        stopPolling()
        emit("cancelled")
      }
    } catch {
      // silently ignore polling errors
    }
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function handleCancel() {
  isCancelling.value = true
  try {
    await $fetch(`/api/purchases/${refCode}/cancel`, { method: "PATCH" })
  } catch {
    // ignore — still move to cancelled UI
  } finally {
    isCancelling.value = false
    stopPolling()
    emit("cancelled")
  }
}

onMounted(() => startPolling())
onUnmounted(() => stopPolling())
</script>

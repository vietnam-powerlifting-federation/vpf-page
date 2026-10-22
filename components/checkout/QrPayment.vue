<template>
  <div class="grid max-w-md gap-5">
    <p>{{ $t("checkout.scanQr") }}</p>

    <dl class="grid gap-2 rounded-md border border-surface-200 bg-surface-50 p-4 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-muted-color">{{ $t("checkout.amount") }}</dt>
        <dd class="font-display text-xl font-bold tabular-nums">{{ formatVnd(amount, locale) }}</dd>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <dt class="text-muted-color">{{ $t("checkout.transferNote") }}</dt>
        <dd class="font-mono text-base font-bold">SEVQR {{ refCode }}</dd>
      </div>
    </dl>

    <!-- QR codes need a light background to scan, in either theme. -->
    <img :src="qrUrl" :alt="$t('checkout.qrAlt')" width="256" height="256" class="mx-auto size-64 rounded-md bg-light p-2">

    <p class="flex items-center justify-center gap-2 text-sm text-muted-color" role="status">
      <ProgressSpinner class="!m-0 !size-4" stroke-width="6" />
      {{ $t("checkout.waitingForPayment") }}
    </p>

    <Button :label="$t('checkout.cancelButton')" severity="danger" variant="text" :loading="isCancelling" class="justify-self-center" @click="handleCancel" />
  </div>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

/** Bank-transfer QR for a pending purchase. Polls until the payment is matched or cancelled. */
const { refCode, amount, qrUrl } = defineProps<{
  refCode: string
  amount: number
  qrUrl: string
}>()

const emit = defineEmits<{ paid: []; cancelled: [] }>()

const POLL_INTERVAL_MS = 3_000

const { t, locale } = useI18n()
const toast = useToast()

const isCancelling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await $fetch<ApiResponse<PurchaseStatus>>(`/api/purchases/${refCode}` as string)
      if (!res.success || !res.data) return

      if (res.data.status === "active") {
        stopPolling()
        // The payment arrives in the background, so it is announced with a toast.
        toast.add({ severity: "success", summary: t("general.success"), detail: t("checkout.paymentSuccess"), life: 5000 })
        emit("paid")
      } else if (res.data.status === "cancelled") {
        stopPolling()
        emit("cancelled")
      }
    } catch {
      // Polling errors are transient; the next tick tries again.
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
    // Still show the cancelled state; an unpaid purchase expires on its own.
  } finally {
    isCancelling.value = false
    stopPolling()
    emit("cancelled")
  }
}

onMounted(startPolling)
onUnmounted(stopPolling)
</script>

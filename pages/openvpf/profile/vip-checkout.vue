<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.vipCheckout.title") }}</h1>

    <div v-if="step === 'initial'" class="space-y-6 max-w-md">
      <div class="border border-surface-600 rounded-lg p-5 bg-surface-800 space-y-4">
        <div class="flex items-center gap-3">
          <i class="pi pi-star text-yellow-400 text-xl" />
          <span class="text-lg font-semibold text-surface-0">{{ $t("profile.vipCheckout.planName") }}</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold text-primary">{{ formatAmount(CHECKOUT_AMOUNT) }}</span>
          <span class="text-surface-400 text-sm">VND</span>
        </div>
        <ul class="text-sm text-surface-400 space-y-2 pt-1">
          <li><i class="pi pi-check mr-2 text-green-400" />{{ $t("profile.vipCheckout.benefit1") }}</li>
          <li><i class="pi pi-check mr-2 text-green-400" />{{ $t("profile.vipCheckout.benefit2") }}</li>
          <li><i class="pi pi-check mr-2 text-green-400" />{{ $t("profile.vipCheckout.benefit3") }}</li>
        </ul>
      </div>
      <Button
        :label="$t('profile.vipCheckout.confirmButton')"
        class="w-full"
        :loading="isCreating"
        @click="handleConfirm"
      />
      <Button
        :label="$t('profile.vipCheckout.backButton')"
        severity="secondary"
        text
        class="w-full"
        @click="navigateTo('/openvpf/profile/vip-benefits')"
      />
    </div>

    <div v-else-if="step === 'pending'" class="space-y-5 max-w-md">
      <p class="text-surface-300 text-sm">{{ $t("profile.vipCheckout.scanQr") }}</p>

      <div class="bg-surface-800 rounded-lg p-4 space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-surface-400">{{ $t("profile.vipCheckout.amount") }}</span>
          <span class="font-semibold text-surface-0">{{ formatAmount(CHECKOUT_AMOUNT) }} VND</span>
        </div>
        <div class="flex justify-between">
          <span class="text-surface-400">{{ $t("profile.vipCheckout.transferNote") }}</span>
          <span class="font-mono font-bold text-primary">VPF{{ purchase?.refCode }}</span>
        </div>
      </div>

      <div class="flex justify-center">
        <img
          :src="qrUrl"
          :alt="$t('profile.vipCheckout.qrAlt')"
          class="w-64 h-64 rounded-lg bg-white"
        >
      </div>

      <div class="flex items-center gap-2 justify-center text-surface-400 text-sm">
        <ProgressSpinner style="width: 16px; height: 16px;" stroke-width="4" />
        <span>{{ $t("profile.vipCheckout.waitingForPayment") }}</span>
      </div>

      <div class="flex justify-center pt-1">
        <Button
          :label="$t('profile.vipCheckout.cancelButton')"
          severity="danger"
          text
          size="small"
          :loading="isCancelling"
          @click="handleCancel"
        />
      </div>
    </div>

    <div v-else-if="step === 'cancelled'" class="text-center py-12 space-y-4 max-w-md">
      <i class="pi pi-times-circle text-5xl text-red-400" />
      <p class="text-surface-300">{{ $t("profile.vipCheckout.cancelled") }}</p>
      <Button
        :label="$t('profile.vipCheckout.backButton')"
        severity="secondary"
        @click="navigateTo('/openvpf/profile/vip-benefits')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue"
import { useToast } from "primevue/usetoast"
import Button from "@/components/volt/Button.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated, PurchaseStatus } from "~/types/purchases"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const CHECKOUT_AMOUNT = 300_000
const VIETQR_BANK_ID = "MB"
const VIETQR_ACCOUNT_NO = "0123456789"
const VIETQR_ACCOUNT_NAME = "VPF VIET NAM"
const POLL_INTERVAL_MS = 3_000

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

type Step = "initial" | "pending" | "cancelled"

const step = ref<Step>("initial")
const purchase = ref<PurchaseCreated | null>(null)
const isCreating = ref(false)
const isCancelling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const qrUrl = computed(() => {
  if (!purchase.value) return ""
  const addInfo = `VPF${purchase.value.refCode}`
  const params = new URLSearchParams({
    amount: String(CHECKOUT_AMOUNT),
    addInfo,
    accountName: VIETQR_ACCOUNT_NAME,
  })
  return `https://img.vietqr.io/image/${VIETQR_BANK_ID}-${VIETQR_ACCOUNT_NO}-compact2.png?${params.toString()}`
})

function formatAmount(amount: number) {
  return amount.toLocaleString("vi-VN")
}

async function handleConfirm() {
  isCreating.value = true
  try {
    const res = (await $fetch("/api/purchases", {
      method: "POST",
      body: { plan: "1year", type: "vip" },
    })) as ApiResponse<PurchaseCreated>

    if (!res.success || !res.data) {
      const msg = res.message?.vi ?? res.message?.en ?? t("general.validationError")
      toast.add({ severity: "error", summary: t("general.updateError"), detail: msg, life: 5000 })
      return
    }

    purchase.value = res.data
    step.value = "pending"
    startPolling(res.data.refCode)
  } catch {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: t("general.validationError"), life: 5000 })
  } finally {
    isCreating.value = false
  }
}

function startPolling(refCode: string) {
  pollTimer = setInterval(async () => {
    try {
      const res = (await $fetch(`/api/purchases/${refCode}`)) as ApiResponse<PurchaseStatus>
      if (!res.success || !res.data) return

      if (res.data.status === "active") {
        stopPolling()
        toast.add({ severity: "success", summary: t("general.success"), detail: t("profile.vipCheckout.paymentSuccess"), life: 5000 })
        router.push("/openvpf/profile/vip-benefits")
      } else if (res.data.status === "cancelled") {
        stopPolling()
        step.value = "cancelled"
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
  if (!purchase.value) return
  isCancelling.value = true
  try {
    await $fetch(`/api/purchases/${purchase.value.refCode}/cancel`, { method: "PATCH" })
  } catch {
    // ignore — still move to cancelled UI
  } finally {
    isCancelling.value = false
    stopPolling()
    step.value = "cancelled"
  }
}

onUnmounted(() => {
  stopPolling()
})

useHead({
  title: () => t("profile.vipCheckout.title"),
})
</script>

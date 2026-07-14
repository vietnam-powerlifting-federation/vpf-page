<template>
  <div class="min-h-screen dark-bg">
    <div class="container mx-auto px-4 py-8 max-w-5xl">
      <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("checkout.title") }}</h1>

      <!-- Initial step: two-column layout -->
      <div v-if="step === 'initial'" class="flex flex-col lg:flex-row gap-6 items-start">
        <!-- Left card: Items table -->
        <div class="flex-1 border border-surface-600 rounded-lg p-5 bg-surface-800">
          <h2 class="text-base font-semibold text-surface-0 mb-4">{{ $t("checkout.itemsTitle") }}</h2>

          <DataTable :value="items" class="text-sm">
            <template #empty>
              <div class="text-surface-400 text-sm py-8 text-center">{{ $t("checkout.emptyCart") }}</div>
            </template>
            <Column :header="$t('checkout.item')">
              <template #body="{ data }">
                {{ data.name[locale as 'en' | 'vi'] ?? data.name.en }}
              </template>
            </Column>
            <Column :header="$t('checkout.price')" style="text-align: right">
              <template #body="{ data }">
                <span class="font-semibold whitespace-nowrap">{{ formatAmount(data.amount) }} VND</span>
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Right card: Total + confirm button -->
        <div class="lg:w-72 w-full border border-surface-600 rounded-lg p-5 bg-surface-800 flex flex-col gap-4">
          <h2 class="text-base font-semibold text-surface-0">{{ $t("checkout.totalTitle") }}</h2>
          <div class="flex justify-between items-baseline border-t border-surface-600 pt-4">
            <span class="text-surface-400 text-sm">{{ $t("checkout.total") }}</span>
            <span class="text-2xl font-bold text-primary">{{ formatAmount(total) }} VND</span>
          </div>
          <Button
            :label="$t('checkout.confirmButton')"
            class="w-full"
            :loading="isCreating"
            :disabled="items.length === 0"
            @click="handleConfirm"
          />
          <Button
            :label="$t('checkout.backButton')"
            severity="secondary"
            text
            class="w-full"
            @click="router.back()"
          />
        </div>
      </div>

      <!-- Pending step: QR code payment -->
      <CheckoutQrPayment
        v-else-if="step === 'pending' && purchase"
        :ref-code="purchase.refCode"
        :amount="purchase.amount"
        :qr-url="purchase.qrUrl"
        @paid="onPaid"
        @cancelled="step = 'cancelled'"
      />

      <!-- Cancelled step -->
      <div v-else-if="step === 'cancelled'" class="text-center py-12 space-y-4 max-w-md">
        <i class="pi pi-times-circle text-5xl text-red-400" />
        <p class="text-surface-300">{{ $t("checkout.cancelled") }}</p>
        <Button
          :label="$t('checkout.backButton')"
          severity="secondary"
          @click="router.back()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated } from "~/types/purchases"
import type { CheckoutItem } from "~/types/checkout"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"

definePageMeta({
  layout: "openvpf",
  middleware: "auth",
})

const { t, locale } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()
const router = useRouter()

type Step = "initial" | "pending" | "cancelled"

const step = ref<Step>("initial")
const items = ref<CheckoutItem[]>([])
const purchase = ref<PurchaseCreated | null>(null)
const isCreating = ref(false)

const total = computed(() => items.value.reduce((sum, item) => sum + item.amount, 0))

onMounted(() => {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (raw) {
      items.value = JSON.parse(raw) as CheckoutItem[]
    }
  } catch {
    items.value = []
  }
})

function formatAmount(amount: number) {
  return amount.toLocaleString("vi-VN")
}

async function handleConfirm() {
  if (items.value.length === 0) return
  const item = items.value[0]

  isCreating.value = true
  try {
    const res = (await $fetch("/api/purchases", {
      method: "POST",
      body: { plan: item.plan, type: item.type },
    })) as ApiResponse<PurchaseCreated>

    if (!res.success || !res.data) {
      const msg = apiMessage(res) || t("general.validationError")
      toast.add({ severity: "error", summary: t("general.updateError"), detail: msg, life: 5000 })
      return
    }

    purchase.value = res.data
    step.value = "pending"
  } catch {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: t("general.validationError"), life: 5000 })
  } finally {
    isCreating.value = false
  }
}

function onPaid() {
  localStorage.removeItem(CHECKOUT_STORAGE_KEY)
  router.push("/openvpf/profile/vip-benefits")
}

useHead({
  title: () => t("checkout.title"),
})
</script>

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

          <CheckoutVoucherPicker
            v-if="voucherType && items.length"
            v-model="selectedVoucherCode"
            :type="voucherType"
            :vouchers="vouchers"
          />

          <div class="border-t border-surface-600 pt-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-surface-400">{{ $t("checkout.subtotal") }}</span>
              <span class="text-surface-0">{{ formatAmount(totals.subtotal) }} VND</span>
            </div>
            <div v-for="line in discountedLines" :key="line.type" class="flex justify-between text-primary">
              <span>{{ $t("checkout.discount") }} · {{ line.voucher!.code }}</span>
              <span>-{{ formatAmount(line.discount) }} VND</span>
            </div>
          </div>

          <div class="flex justify-between items-baseline border-t border-surface-600 pt-4">
            <span class="text-surface-400 text-sm">{{ $t("checkout.total") }}</span>
            <span class="text-2xl font-bold text-primary">{{ formatAmount(totals.payable) }} VND</span>
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
        v-else-if="step === 'pending' && purchase?.qrUrl"
        :ref-code="purchase.refCode"
        :amount="purchase.amount"
        :qr-url="purchase.qrUrl"
        @paid="onPaid"
        @cancelled="step = 'cancelled'"
      />

      <!-- Free step: a voucher covered the whole amount, so the purchase is already active -->
      <div v-else-if="step === 'free'" class="text-center py-12 space-y-4 max-w-md">
        <i class="pi pi-check-circle text-5xl text-primary" />
        <h2 class="text-xl font-semibold text-surface-0">{{ $t("checkout.freeTitle") }}</h2>
        <p class="text-surface-300">{{ $t("checkout.freeBody") }}</p>
        <Button :label="$t('checkout.viewBenefits')" @click="onPaid" />
      </div>

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
import { computeVoucherTotals, type LineItems } from "~/lib/utils/vouchers"
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

type Step = "initial" | "pending" | "free" | "cancelled"

const step = ref<Step>("initial")
const items = ref<CheckoutItem[]>([])
const purchase = ref<PurchaseCreated | null>(null)
const isCreating = ref(false)
const selectedVoucherCode = ref<string | null>(null)

// This endpoint creates one-type purchases, so there is a single line item to discount.
const voucherType = computed(() => items.value[0]?.type ?? null)
const { vouchers } = useAthleteVouchers({ available: true }, "checkout-vouchers")

const selectedVoucher = computed(() => vouchers.value.find((v) => v.code === selectedVoucherCode.value) ?? null)

/**
 * The live total, computed with the same function the server uses at creation.
 * The server recomputes authoritatively and its number wins.
 */
const totals = computed(() => {
  const lineItems: LineItems = {}
  for (const item of items.value) lineItems[item.type] = (lineItems[item.type] ?? 0) + item.amount
  return computeVoucherTotals(lineItems, selectedVoucher.value ? [selectedVoucher.value] : [])
})

const discountedLines = computed(() => totals.value.lines.filter((line) => line.discount > 0))

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
      body: { plan: item.plan, type: item.type, voucherCode: selectedVoucherCode.value ?? undefined },
    })) as ApiResponse<PurchaseCreated>

    if (!res.success || !res.data) {
      const msg = apiMessage(res) || t("general.validationError")
      toast.add({ severity: "error", summary: t("general.updateError"), detail: msg, life: 5000 })
      return
    }

    purchase.value = res.data
    // A fully-discounted purchase arrives already active: show success, not a QR.
    if (res.data.status === "active") {
      localStorage.removeItem(CHECKOUT_STORAGE_KEY)
      step.value = "free"
      return
    }
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

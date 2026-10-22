<template>
  <div>
    <PageHeader :kicker="$t('checkout.kicker')" :title="$t('checkout.title')" :lede="$t('checkout.lede')" compact />

    <PageSection class="grid gap-6">
      <StepIndicator :steps="stepLabels" :current="stepIndex" :label="$t('steps.progress')" />

      <!-- Order, voucher and total -->
      <div v-if="step === 'initial'" class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <PagePanel :title="$t('checkout.itemsTitle')" ruled>
          <p v-if="items.length === 0" class="py-6 text-center text-muted-color">{{ $t("checkout.emptyCart") }}</p>
          <ul v-else class="grid">
            <li v-for="item in items" :key="item.plan" class="flex items-baseline justify-between gap-4 border-b border-surface-200 py-3 last:border-b-0">
              <span class="font-semibold">{{ item.name[locale as "en" | "vi"] ?? item.name.en }}</span>
              <span class="font-display text-xl font-bold whitespace-nowrap tabular-nums">{{ formatVnd(item.amount, locale) }}</span>
            </li>
          </ul>
        </PagePanel>

        <PagePanel :title="$t('checkout.totalTitle')" class="lg:sticky lg:top-20">
          <div class="grid gap-5">
            <VoucherPicker v-if="voucherType && items.length" v-model="selectedVoucherCode" :type="voucherType" :vouchers="vouchers" />
            <CartSummary :lines="summaryLines" :total="totals.payable" />
            <div class="grid gap-2">
              <Button :label="$t('checkout.confirmButton')" :loading="isCreating" :disabled="items.length === 0" class="w-full" @click="handleConfirm" />
              <Button :label="$t('checkout.backButton')" severity="secondary" variant="text" class="w-full" @click="router.back()" />
            </div>
          </div>
        </PagePanel>
      </div>

      <!-- Bank-transfer QR -->
      <PagePanel v-else-if="step === 'pending' && purchase?.qrUrl" ruled>
        <QrPayment :ref-code="purchase.refCode" :amount="purchase.amount" :qr-url="purchase.qrUrl" @paid="onPaid" @cancelled="step = 'cancelled'" />
      </PagePanel>

      <!-- A voucher covered the whole amount, so the purchase is already active -->
      <PagePanel v-else-if="step === 'free'" ruled class="max-w-xl">
        <div class="grid justify-items-start gap-3">
          <AppIcon name="lucide:circle-check" class="size-10 text-success" />
          <h2 class="font-display text-2xl font-bold uppercase">{{ $t("checkout.freeTitle") }}</h2>
          <p>{{ $t("checkout.freeBody") }}</p>
          <Button :label="$t('checkout.viewBenefits')" @click="onPaid" />
        </div>
      </PagePanel>

      <PagePanel v-else-if="step === 'cancelled'" class="max-w-xl">
        <div class="grid justify-items-start gap-3">
          <AppIcon name="lucide:circle-x" class="size-10 text-danger" />
          <p>{{ $t("checkout.cancelled") }}</p>
          <Button :label="$t('checkout.backButton')" severity="secondary" @click="router.back()" />
        </div>
      </PagePanel>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"
import { computeVoucherTotals, type LineItems } from "~/lib/domain/vouchers"
import type { ApiResponse } from "~/types/api"
import type { PurchaseCreated } from "~/types/purchases"
import type { CheckoutItem } from "~/types/checkout"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"

definePageMeta({
  layout: "default",
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

const summaryLines = computed(() => [
  { key: "subtotal", label: t("checkout.subtotal"), amount: totals.value.subtotal },
  ...discountedLines.value.map((line) => ({ key: `discount-${line.type}`, label: `${t("checkout.discount")} · ${line.voucher?.code ?? ""}`, amount: line.discount, discount: true })),
])

const stepLabels = computed(() => [t("checkout.steps.review"), t("checkout.steps.pay"), t("checkout.steps.done")])
const stepIndex = computed(() => (step.value === "initial" ? 0 : step.value === "pending" ? 1 : 2))

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
  router.push("/profile/vip-benefits")
}

useHead({
  title: () => t("checkout.title"),
})
</script>

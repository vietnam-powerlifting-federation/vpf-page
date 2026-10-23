import { computeVoucherTotals, type LineItems } from "~/lib/domain/vouchers"
import type { ApiResponse } from "~/types/api"
import type { CheckoutItem } from "~/types/checkout"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"
import type { PurchaseCreated } from "~/types/purchases"

type Step = "initial" | "pending" | "free" | "cancelled"

/**
 * Checkout: the cart saved by the page that sent the athlete here, an optional
 * voucher, the purchase request, and the step it ends on (review, bank-transfer
 * QR, fully discounted, or cancelled). Returned as one reactive object.
 */
export function useCheckoutPage() {
  const { t } = useI18n()
  const notify = useNotify()
  const apiMessage = useApiMessage()
  const router = useRouter()

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

  const summaryLines = computed(() => [
    { key: "subtotal", label: t("checkout.subtotal"), amount: totals.value.subtotal },
    ...totals.value.lines
      .filter((line) => line.discount > 0)
      .map((line) => ({ key: `discount-${line.type}`, label: `${t("checkout.discount")} · ${line.voucher?.code ?? ""}`, amount: line.discount, discount: true })),
  ])

  const stepLabels = computed(() => [t("checkout.steps.review"), t("checkout.steps.pay"), t("checkout.steps.done")])
  const stepIndex = computed(() => (step.value === "initial" ? 0 : step.value === "pending" ? 1 : 2))

  onMounted(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw) as CheckoutItem[]
    } catch {
      items.value = []
    }
  })

  async function confirm() {
    if (items.value.length === 0) return
    const item = items.value[0]

    isCreating.value = true
    try {
      const res = (await $fetch("/api/purchases", {
        method: "POST",
        body: { plan: item.plan, type: item.type, voucherCode: selectedVoucherCode.value ?? undefined },
      })) as ApiResponse<PurchaseCreated>

      if (!res.success || !res.data) {
        notify.error(apiMessage(res) || t("general.validationError"), t("general.updateError"))
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
      notify.error(t("general.validationError"), t("general.updateError"))
    } finally {
      isCreating.value = false
    }
  }

  function done() {
    localStorage.removeItem(CHECKOUT_STORAGE_KEY)
    router.push("/profile/vip-benefits")
  }

  const selectVoucher = (code: string | null) => { selectedVoucherCode.value = code }
  const back = () => router.back()
  const cancel = () => { step.value = "cancelled" }

  return reactive({
    step, stepLabels, stepIndex,
    items, voucherType, vouchers, selectedVoucherCode,
    summaryLines, total: computed(() => totals.value.payable),
    purchase, isCreating,
    selectVoucher, confirm, done, back, cancel,
  })
}

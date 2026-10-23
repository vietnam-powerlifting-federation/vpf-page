import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

/** The signed-in athlete's purchases, and the one whose bank-transfer QR is open. Call with `await`. */
export async function usePaymentHistory() {
  const { data, pending, error, refresh } = await useFetch<ApiResponse<PurchaseStatus[]>>("/api/athletes/me/purchases")

  const purchases = computed(() => data.value?.data ?? [])

  const qrOpen = ref(false)
  const selected = ref<PurchaseStatus | null>(null)

  function openQr(purchase: PurchaseStatus) {
    selected.value = purchase
    qrOpen.value = true
  }

  // QrPayment announces the payment or cancellation itself; here the dialog closes and the list reloads.
  function closeQr() {
    qrOpen.value = false
    refresh()
  }

  return reactive({ purchases, pending, error, qrOpen, selected, openQr, closeQr })
}

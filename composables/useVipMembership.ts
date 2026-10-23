import { formatVnd } from "~/lib/domain/format"
import { VIP_PRICE, isVipActive } from "~/lib/domain/vip"
import type { CheckoutItem } from "~/types/checkout"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"

/**
 * The signed-in athlete's VIP membership: whether it is active, when it ends, and the way to buy
 * a year. Admins can flip the view to preview what a non-VIP (or VIP) athlete sees.
 */
export function useVipMembership() {
  const { locale } = useI18n()
  const { data: profileResponse, pending } = useProfileAthlete()

  const userData = computed(() => profileResponse.value?.athlete ?? null)
  const vipSettings = computed(() => profileResponse.value?.vipSettings ?? null)

  const expiresAt = computed(() => userData.value?.vipMembershipExpiresAt ?? null)
  const active = computed(() => isVipActive(expiresAt.value))
  const isAdmin = computed(() => userData.value?.role === "admin")
  const athleteName = computed(() => userData.value?.fullName ?? "")

  const previewInverted = ref(false)
  const setPreviewInverted = (value: boolean) => { previewInverted.value = value }
  const showActive = computed(() => (previewInverted.value ? !active.value : active.value))

  const publicProfileUrl = computed(() => {
    const athlete = userData.value
    if (!athlete || !showActive.value) return null
    return `/athletes/${athlete.slug || athlete.vpfId}`
  })

  const formattedPrice = computed(() => formatVnd(VIP_PRICE, locale.value))

  function goToCheckout() {
    const item: CheckoutItem = {
      id: "vip-1year",
      name: { en: "1 Year VIP Membership", vi: "Gói VIP 1 năm" },
      amount: VIP_PRICE,
      type: "vip",
      plan: "1year",
    }
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify([item]))
    navigateTo("/checkout")
  }

  return reactive({
    pending, vipSettings, expiresAt, active, isAdmin, athleteName,
    previewInverted, setPreviewInverted, showActive, publicProfileUrl, formattedPrice, goToCheckout,
  })
}

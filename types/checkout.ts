export type CheckoutItem = {
  id: string
  name: { en: string; vi: string }
  amount: number
  type: "vip" | "vpf_membership" | "competition"
  plan: "6months" | "1year"
}

export const CHECKOUT_STORAGE_KEY = "vpf_checkout_items"

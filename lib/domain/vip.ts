import type { VipBenefits, VipSettingsFormState } from "~/types/vip"

/**
 * VIP membership is active only when an expiry date exists and is on or after today.
 *
 * A null expiry means "never purchased" — new athletes are created without one
 * (see server/api/auth/register.post.ts), so treating null as active would hand
 * every registered athlete a free VIP profile. Permanent VIP is granted by setting
 * a far-future date in the admin panel, not by clearing the field.
 */
export function isVipActive(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const today = new Date().toISOString().slice(0, 10)
  return expiresAt >= today
}

/** One year of VIP, in đồng. */
export const VIP_PRICE = 300_000

export const VIP_BANNER_KEYS = ["bannerImageUrl1", "bannerImageUrl2", "bannerImageUrl3", "bannerImageUrl4", "bannerImageUrl5"] as const

/** The VIP settings form with nothing set: text fields empty, every "show on profile" switch off. */
export function defaultVipForm(): VipSettingsFormState {
  return {
    avatarImageUrl: null,
    bannerImageUrl1: null,
    bannerImageUrl2: null,
    bannerImageUrl3: null,
    bannerImageUrl4: null,
    bannerImageUrl5: null,
    profileDescription: null,
    displayProfileDescription: false,
    alias: null,
    displayAlias: false,
    facebook: null,
    displayFacebook: false,
    instagram: null,
    displayInstagram: false,
    tiktok: null,
    displayTiktok: false,
    youtube: null,
    displayYoutube: false,
    vipPhoneNumber: null,
    displayMobilePhone: false,
    decorator1: null,
    decorator2: null,
  }
}

/** The form's state for saved settings: booleans default to false, everything else to null. */
export function toVipFormState(settings: VipBenefits): VipSettingsFormState {
  const base = defaultVipForm()
  for (const key of Object.keys(base) as (keyof VipSettingsFormState)[]) {
    const incoming = settings[key as keyof VipBenefits]
    base[key] = (incoming ?? (typeof base[key] === "boolean" ? false : null)) as never
  }
  return base
}

/** How an uploaded image is cropped: which picture it is, and the size and format it is saved in. */
export function vipCropSettings(target: "avatar" | number | null) {
  return target === "avatar"
    // Avatars sit in a circular mask over a dark surface, so alpha has to survive.
    ? { aspectRatio: 1, width: 512, height: 512, type: "image/png", fileName: "avatar.png" }
    // 24:9 matches BannerSlideshow's slide geometry exactly.
    : { aspectRatio: 24 / 9, width: 1600, height: 600, type: "image/jpeg", fileName: "banner.jpg" }
}

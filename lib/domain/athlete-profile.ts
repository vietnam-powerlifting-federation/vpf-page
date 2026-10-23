import { SEX_LABEL_KEY } from "~/lib/domain/format"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"
import type { Sex } from "~/types/union-types"

type Translate = (key: string, params?: Record<string, unknown>) => string

/** "Men · VPF000084 · Born 1998 · Việt Nam": the line under an athlete's name. */
export function athleteMetaLine(athlete: UserPublic, sex: Sex | null, t: Translate): string {
  return [
    sex ? t(SEX_LABEL_KEY[sex]) : null,
    athlete.vpfId,
    athlete.dob ? t("athlete.born", { year: athlete.dob }) : null,
    athlete.nationality,
  ].filter(Boolean).join(" · ")
}

/** The banner images a VIP athlete has uploaded, in order. */
export function vipBanners(vip: VipBenefits | null): string[] {
  if (!vip) return []
  return [vip.bannerImageUrl1, vip.bannerImageUrl2, vip.bannerImageUrl3, vip.bannerImageUrl4, vip.bannerImageUrl5].filter((url): url is string => !!url)
}

/** Whether any social link or phone number is both set and chosen for display. */
export function hasVisibleSocials(vip: VipBenefits | null): boolean {
  if (!vip) return false
  return Boolean(
    (vip.displayFacebook && vip.facebook) || (vip.displayInstagram && vip.instagram) || (vip.displayTiktok && vip.tiktok)
    || (vip.displayYoutube && vip.youtube) || (vip.displayMobilePhone && vip.vipPhoneNumber),
  )
}

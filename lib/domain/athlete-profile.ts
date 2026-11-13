import { SEX_SHORT_LABEL_KEY } from "~/lib/domain/format"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"
import type { Sex } from "~/types/union-types"

type Translate = (key: string, params?: Record<string, unknown>) => string

/** "Nguyễn Văn An (M)": the athlete's name with their category, as shown in the page title. */
export function athleteDisplayName(athlete: UserPublic, sex: Sex | null, t: Translate): string {
  return sex ? `${athlete.fullName} (${t(SEX_SHORT_LABEL_KEY[sex])})` : athlete.fullName
}

/** The banner images a VIP athlete has uploaded, in order. */
export function vipBanners(vip: VipBenefits | null): string[] {
  if (!vip) return []
  return [vip.bannerImageUrl1, vip.bannerImageUrl2, vip.bannerImageUrl3, vip.bannerImageUrl4, vip.bannerImageUrl5].filter((url): url is string => !!url)
}

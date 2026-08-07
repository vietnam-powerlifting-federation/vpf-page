import type { InferSelectModel } from "drizzle-orm"
import type { vipBenefits } from "~/lib/external/drizzle/migrations/schema"

export type VipBenefits = InferSelectModel<typeof vipBenefits>

/**
 * In-progress state of the VIP settings editor, shared by the page, the form and the
 * live preview. Image URLs may point at a saved R2 object or, while editing, at nothing
 * at all — pending local files are tracked separately as blob URLs.
 */
export type VipSettingsFormState = Partial<
  Omit<VipBenefits, "vpfId"> & {
    avatarImageUrl: string | null
    bannerImageUrl1: string | null
    bannerImageUrl2: string | null
    bannerImageUrl3: string | null
    bannerImageUrl4: string | null
    bannerImageUrl5: string | null
  }
>

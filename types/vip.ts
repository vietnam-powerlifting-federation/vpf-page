import type { InferSelectModel } from "drizzle-orm"
import type { vipBenefits } from "~/lib/external/drizzle/migrations/schema"

export type VipBenefits = InferSelectModel<typeof vipBenefits>

import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { vipBenefits } from "~/lib/external/drizzle/migrations/schema"

export const VipSettingsPatchSchema = createSelectSchema(vipBenefits).partial().omit({
  vpfId: true,
})

export type VipSettingsPatch = z.infer<typeof VipSettingsPatchSchema>

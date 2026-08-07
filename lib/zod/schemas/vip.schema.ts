import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { vipBenefits } from "~/lib/external/drizzle/migrations/schema"

/**
 * Decorators are interpolated raw into `style="background: linear-gradient(...)"` by
 * nameGradientStyle (lib/utils/client.ts) and AthleteAvatar.vue, and GET /api/vip-settings
 * publishes every VIP athlete's pair site-wide (leaderboards, records, meet rankings).
 * An unconstrained value such as `url(https://attacker.example/p.png)` would therefore make
 * every visitor's browser call an attacker-controlled host. Restricting to #RRGGBB leaves no
 * room for parentheses, colons or whitespace.
 */
const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Decorator must be a #RRGGBB hex colour")
  .nullable()

export const VipSettingsPatchSchema = createSelectSchema(vipBenefits)
  .partial()
  .omit({
    vpfId: true,
  })
  .extend({
    decorator1: HexColor.optional(),
    decorator2: HexColor.optional(),
  })

export type VipSettingsPatch = z.infer<typeof VipSettingsPatchSchema>

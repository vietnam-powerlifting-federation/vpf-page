import { gte, sql, eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import { logger } from "~/lib/logger/logger"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"

type VipDecoratorSettings = {
  vpfId: string
  decorator1: string | null
  decorator2: string | null
}

// Mirrors isVipActive in lib/utils/vip.ts: a null expiry means "never purchased",
// so those athletes' decorators must not be published site-wide.
const vipMembershipActive = gte(users.vipMembershipExpiresAt, sql`CURRENT_DATE`)

export default defineEventHandler(async (event): Promise<ApiResponse<VipDecoratorSettings[]>> => {
  try {
    const settings = await db
      .select({
        vpfId: vipBenefits.vpfId,
        decorator1: vipBenefits.decorator1,
        decorator2: vipBenefits.decorator2,
      })
      .from(vipBenefits)
      .innerJoin(users, eq(vipBenefits.vpfId, users.vpfId))
      .where(vipMembershipActive)

    return ok(settings, {
      en: "VIP settings retrieved successfully",
      vi: "Lấy cài đặt VIP thành công",
    })
  } catch (error) {
    logger.error("Error fetching VIP settings", { error })
    return fail(event, 500, MSG.internalError)
  }
})

import { listActiveVipDecorators } from "~/server/repository/athletes"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"

type VipDecoratorSettings = {
  vpfId: string
  decorator1: string | null
  decorator2: string | null
}

// The "live VIP membership" rule lives with the query, in the athletes repository.
export default defineApiHandler(async (_event): Promise<ApiResponse<VipDecoratorSettings[]>> => {
  const settings = await listActiveVipDecorators()

  return ok(settings, {
    en: "VIP settings retrieved successfully",
    vi: "Lấy cài đặt VIP thành công",
  })
})

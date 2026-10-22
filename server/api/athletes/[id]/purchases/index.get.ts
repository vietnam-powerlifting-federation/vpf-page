import { listPurchasesForAthlete } from "~/server/repository/purchases"
import { resolveAthleteId } from "~/server/service/athletes"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import { buildQrUrl } from "~/server/service/purchase-codes"
import type { ApiResponse } from "~/types/api"
import type { PurchaseStatus } from "~/types/purchases"

export default defineApiHandler(async (event): Promise<ApiResponse<PurchaseStatus[]>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const idParam = getRouterParam(event, "id")
  if (!idParam) return fail(event, 400, MSG.invalidInput)

  // Shared resolver, so a profile slug works here exactly as it does on the
  // athlete record. This route used to treat the segment as a raw VPF id.
  const resolved = await resolveAthleteId(idParam, currentUser)
  if (!resolved.ok) {
    return resolved.reason === "unauthenticated"
      ? fail(event, 401, MSG.unauthorized)
      : fail(event, 404, MSG.athleteNotFound)
  }

  if (!resolved.isSelf && currentUser.role !== "admin") {
    return fail(event, 403, {
      en: "You may only view your own purchases, or an admin may view any athlete's",
      vi: "Bạn chỉ có thể xem giao dịch của mình, hoặc admin có thể xem của bất kỳ vận động viên nào",
    })
  }

  const rows = await listPurchasesForAthlete(resolved.vpfId)

  return ok(
    rows.map((p) => ({
      purchaseId: p.purchaseId,
      refCode: p.refCode,
      type: p.type,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt ?? null,
      cancelledAt: p.cancelledAt ?? null,
      ...(p.status === "pending" ? { qrUrl: buildQrUrl(p.refCode, p.amount) } : {}),
    })),
    { en: "Purchases retrieved successfully", vi: "Lấy danh sách giao dịch thành công" },
  )
})

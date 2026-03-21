import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import { userPrivateSelect, userPublicSelect } from "~/lib/utils/queries/users"
import { getMeetsAndResultsAndAthletes } from "~/lib/utils/queries/queries"
import { getPersonalBestSummary } from "~/lib/utils/queries/results"
import { fetchAthleteRecordStatus } from "~/lib/utils/queries/records"
import { isVipActive } from "~/lib/utils/vip"
import { logger } from "~/lib/logger/logger"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate, UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import { ok, fail } from "~/server/utils/api-response"

type AthleteDetailsResponse = {
  athlete: UserPrivate | UserPublic
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
  records?: LiftRecord[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<AthleteDetailsResponse>> => {
  try {
    const idParam = getRouterParam(event, "id")
    const currentUser = event.context.user

    if (!idParam) {
      return fail(event, 400, {
        en: "Athlete ID is required",
        vi: "ID vận động viên là bắt buộc",
      }) as ApiResponse<AthleteDetailsResponse>
    }

    let vpfId: string | undefined
    if (idParam === "self") {
      vpfId = currentUser?.vpfId
    } else if (idParam.startsWith("VPF")) {
      vpfId = idParam
    } else {
      const row = await db
        .select({ vpfId: users.vpfId })
        .from(users)
        .where(eq(users.slug, idParam))
        .limit(1)
        .then((rows) => rows[0])
      vpfId = row?.vpfId
    }

    if (!vpfId) {
      if (idParam === "self") {
        return fail(event, 401, {
          en: "Unauthorized",
          vi: "Không được phép",
        }) as ApiResponse<AthleteDetailsResponse>
      }
      return fail(event, 404, {
        en: "Athlete not found",
        vi: "Không tìm thấy vận động viên",
      }) as ApiResponse<AthleteDetailsResponse>
    }

    const isAdmin = currentUser?.role === "admin"
    const isOwnProfile = currentUser?.vpfId === vpfId
    const isPrivate = isAdmin || isOwnProfile

    let athlete
    if (isPrivate) {
      const result = await db
        .select(userPrivateSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    } else {
      const result = await db
        .select(userPublicSelect)
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
      athlete = result[0]
    }

    if (!athlete) {
      return fail(event, 404, {
        en: "Athlete not found",
        vi: "Không tìm thấy vận động viên",
      }) as ApiResponse<AthleteDetailsResponse>
    }

    const query = getQuery(event)
    const excludeHidden = query.excludeHidden === "true" || query.excludeHidden === true
    const includeVipSettings = query.includeVipSettings === "true" || query.includeVipSettings === true
    const includeRecords = query.includeRecords === "true" || query.includeRecords === true
    const { meets: returnedMeets, results } = await getMeetsAndResultsAndAthletes({
      vpfIds: [vpfId],
      hidden: excludeHidden ? false : undefined,
    })

    results.sort((a, b) => b.meetId - a.meetId)
    const compHistory = results
    const personalBest = getPersonalBestSummary(results)

    let vipSettings: VipBenefits | undefined
    if (includeVipSettings) {
      const vipExpiresAt = await db
        .select({ vipMembershipExpiresAt: users.vipMembershipExpiresAt })
        .from(users)
        .where(eq(users.vpfId, vpfId))
        .limit(1)
        .then((rows) => rows[0]?.vipMembershipExpiresAt ?? null)
      if (isVipActive(vipExpiresAt)) {
        const vipRow = await db
          .select()
          .from(vipBenefits)
          .where(eq(vipBenefits.vpfId, vpfId))
          .limit(1)
          .then((rows) => rows[0])
        if (vipRow) vipSettings = vipRow
      }
    }

    let records: LiftRecord[] | undefined
    if (includeRecords) {
      records = await fetchAthleteRecordStatus(vpfId)
    }

    return ok({
      athlete,
      personalBest,
      compHistory,
      meets: returnedMeets,
      ...(vipSettings !== undefined && { vipSettings }),
      ...(records !== undefined && { records }),
    }, {
      en: "Athlete details retrieved successfully",
      vi: "Lấy thông tin vận động viên thành công",
    })
  } catch (error) {
    logger.error("Error fetching athlete details", { error })
    return fail(event, 500, { en: "Internal server error", vi: "Lỗi máy chủ" }) as ApiResponse<AthleteDetailsResponse>
  }
})

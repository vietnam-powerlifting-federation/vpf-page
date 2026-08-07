import { logger } from "~/lib/logger/logger"
import { getRecordHistory } from "~/server/service/records"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublicWithDecorators } from "~/types/users"
import type { Result } from "~/types/results"

type HistoryResponse = {
  records: LiftRecord[]
  meet: MeetPublic | null
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<HistoryResponse>> => {
  try {
    const query = getQuery(event)
    const year = query.year ? parseInt(query.year as string, 10) : null

    const history = await getRecordHistory(year)

    if (!history.meet) {
      return ok(history, { en: "No national meet found", vi: "Không tìm thấy giải quốc gia" })
    }

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")

    return ok(history, {
      en: "Record history retrieved successfully",
      vi: "Lấy lịch sử kỷ lục thành công",
    })
  } catch (error) {
    logger.error("Error fetching record history", { error })
    return fail(event, 500, MSG.internalError)
  }
})

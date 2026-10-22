import { getRecordHistory } from "~/server/service/records"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
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

export default defineApiHandler(async (event): Promise<ApiResponse<HistoryResponse>> => {
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string, 10) : null

  const history = await getRecordHistory(year)

  if (!history.meet) {
    return ok(history, { en: "No national meet found", vi: "Không tìm thấy giải quốc gia" })
  }

  return ok(history, {
    en: "Record history retrieved successfully",
    vi: "Lấy lịch sử kỷ lục thành công",
  })
})

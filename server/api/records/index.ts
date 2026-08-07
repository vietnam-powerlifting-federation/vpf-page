import { logger } from "~/lib/logger/logger"
import { getRecordsForYear } from "~/server/service/records"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublicWithDecorators } from "~/types/users"
import type { Result } from "~/types/results"

type RecordsResponse = {
  records: LiftRecord[]
  meet: MeetPublic[]
  athletes: UserPublicWithDecorators[]
  results: Result[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<RecordsResponse>> => {
  try {
    const query = getQuery(event)
    const year = query.year ? parseInt(query.year as string, 10) : null

    const { records, meets: allMeets, athletes, results } = await getRecordsForYear(year)

    return ok(
      {
        records,
        meet: allMeets,
        athletes,
        results,
      },
      {
        en: "Records retrieved successfully",
        vi: "Lấy thông tin kỷ lục thành công",
      },
    )
  } catch (error) {
    logger.error("Error fetching records", { error })
    return fail(event, 500, MSG.internalError)
  }
})

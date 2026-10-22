import { getRecordsForYear } from "~/server/service/records"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok } from "~/server/utils/api-response"
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

export default defineApiHandler(async (event): Promise<ApiResponse<RecordsResponse>> => {
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
})

import { logger } from "~/lib/logger/logger"
import { fetchRecordsForYear } from "~/lib/utils/queries/records"
import type { ApiResponse } from "~/types/api"
import type { LiftRecord } from "~/types/records"
import type { MeetPublic } from "~/types/meets"
import type { UserPublic } from "~/types/users"

type RecordsResponse = {
  records: LiftRecord[]
  meet: MeetPublic[]
  athletes: UserPublic[]
}

export default defineEventHandler(async (event): Promise<ApiResponse<RecordsResponse>> => {
  try {
    // Get year query parameter
    const query = getQuery(event)
    const year = query.year ? parseInt(query.year as string, 10) : null

    // Fetch records using the utility function
    const { records, meets: allMeets, athletes } = await fetchRecordsForYear({
      maxYear: year,
    })

    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400")
    setResponseStatus(event, 200)

    return {
      success: true,
      data: {
        records,
        meet: allMeets,
        athletes,
      },
      message: {
        en: "Records retrieved successfully",
        vi: "Lấy thông tin kỷ lục thành công",
      },
    }
  } catch (error) {
    logger.error("Error fetching records", { error })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "Internal server error",
        vi: "Lỗi máy chủ",
      },
    }
  }
})

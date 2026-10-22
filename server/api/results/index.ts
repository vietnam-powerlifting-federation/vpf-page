import type { SortKey, MeetType } from "~/lib/domain/results"
import { getRankedResults, type RankedResults } from "~/server/service/results"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import type { ApiResponse } from "~/types/api"
import type { Sex, Division } from "~/types/union-types"

const VALID_SORT_KEYS: SortKey[] = ["bestSquat", "bestBench", "bestDeadlift", "total", "gl"]

export default defineApiHandler(async (event): Promise<ApiResponse<RankedResults>> => {
  const query = getQuery(event)

  const sort: SortKey = (query.sort as SortKey) || "gl"

  if (!VALID_SORT_KEYS.includes(sort)) {
    return fail(event, 400, {
      en: `Invalid sort key. Must be one of: ${VALID_SORT_KEYS.join(", ")}`,
      vi: `Khóa sắp xếp không hợp lệ. Phải là một trong: ${VALID_SORT_KEYS.join(", ")}`,
    })
  }

  const results = await getRankedResults({
    sort,
    distinct: query.distinct === "true" || query.distinct === true,
    meetType: query.meetType as MeetType | undefined,
    division: query.division as Division | undefined,
    weightClass: query.weightClass ? parseInt(query.weightClass as string, 10) : undefined,
    sex: query.sex as Sex | undefined,
  })

  return ok(results, {
    en: "Results retrieved successfully",
    vi: "Lấy kết quả thành công",
  })
})

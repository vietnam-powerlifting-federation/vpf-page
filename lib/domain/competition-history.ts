import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"

/** One line of the athlete's own competition list. */
export type CompetitionHistoryRow = {
  meetId: number
  meetName: string
  meetSlug: string
  hostDate: string | null
  completed: boolean
  displayOnProfile: boolean
}

/** The meets an athlete entered, each marked completed once its date has passed, and whether its result is shown on their profile. */
export function competitionHistoryRows(meets: MeetPublic[], results: Result[], today: string): CompetitionHistoryRow[] {
  const resultByMeet = new Map<number, Result>()
  for (const result of results) resultByMeet.set(result.meetId, result)

  return meets.map((meet) => {
    const result = resultByMeet.get(meet.meetId)
    return {
      meetId: meet.meetId,
      meetName: meet.meetName,
      meetSlug: meet.meetSlug,
      hostDate: meet.hostDate,
      completed: meet.hostDate ? today > meet.hostDate : false,
      displayOnProfile: !!(result && "showOnProfile" in result && result.showOnProfile),
    }
  })
}

import { getRegistrationState } from "~/lib/domain/competition-eligibility"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

const time = (date: string | null) => (date ? new Date(date).getTime() : 0)

export function useMeetsList() {
  const { data: response, pending, error } = useFetch<ApiResponse<MeetPublic[]>>("/api/meets", { key: "meets-list" })

  const allMeets = computed(() => (response.value?.success && response.value.data ? response.value.data : []))

  /** Open for registration now, then those whose registration opens later. */
  const newMeets = computed(() => {
    const open = allMeets.value.filter((meet) => getRegistrationState(meet) === "open")
    const upcoming = allMeets.value.filter((meet) => getRegistrationState(meet) === "upcoming")
    return [
      ...open.sort((a, b) => time(a.closeRegistration) - time(b.closeRegistration)),
      ...upcoming.sort((a, b) => time(a.startRegistration) - time(b.startRegistration)),
    ]
  })

  /** Finished meets, newest first: registration closed, or held already when there was no window. */
  const oldMeets = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allMeets.value
      .filter((meet) => {
        if (meet.startRegistration && meet.closeRegistration) return getRegistrationState(meet) === "closed"
        if (meet.hostDate) return today.getTime() > new Date(meet.hostDate).setHours(0, 0, 0, 0)
        return true
      })
      .sort((a, b) => time(b.hostDate) - time(a.hostDate))
  })

  return { allMeets, newMeets, oldMeets, pending, error }
}

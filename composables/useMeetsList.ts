import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

export const COMPETITIONS_MEETS_KEY = "openvpf-competitions-meets"

export function useMeetsList() {
  const { data: response, pending, error } = useFetch<ApiResponse<MeetPublic[]>>("/api/meets", {
    key: COMPETITIONS_MEETS_KEY,
  })

  const allMeets = computed(() => {
    if (response.value?.success && response.value.data) {
      return response.value.data
    }
    return []
  })

  const newMeets = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allMeets.value.filter((meet) => {
      if (meet.startRegistration && meet.closeRegistration) {
        const startDate = new Date(meet.startRegistration)
        const endDate = new Date(meet.closeRegistration)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        return today >= startDate && today <= endDate
      }
      return false
    })
  })

  const oldMeets = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allMeets.value
      .filter((meet) => {
        if (meet.startRegistration && meet.closeRegistration) {
          const endDate = new Date(meet.closeRegistration)
          endDate.setHours(23, 59, 59, 999)
          return today > endDate
        }
        if (meet.hostDate) {
          const hostDate = new Date(meet.hostDate)
          hostDate.setHours(0, 0, 0, 0)
          return today > hostDate
        }
        return true
      })
      .sort((a, b) => {
        const dateA = a.hostDate ? new Date(a.hostDate).getTime() : 0
        const dateB = b.hostDate ? new Date(b.hostDate).getTime() : 0
        return dateB - dateA
      })
  })

  return {
    allMeets,
    newMeets,
    oldMeets,
    pending,
    error,
  }
}

import { defineStore } from "pinia"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result, PersonalBestSummary } from "~/types/results"
import type { UserPrivate } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

export type AthleteDetailsData = {
  athlete: UserPrivate
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  vipSettings?: VipBenefits
}

type ProfileState = {
  data: AthleteDetailsData | null
  pending: boolean
  error: Error | null
  fetchedAt: number | null
}

export const useProfileStore = defineStore("profile", {
  state: (): ProfileState => ({
    data: null,
    pending: false,
    error: null,
    fetchedAt: null,
  }),
  actions: {
    async fetchProfile(options?: { force?: boolean }) {
      if (!options?.force && this.data) return this.data

      this.pending = true
      this.error = null

      try {
        const response = await $fetch<ApiResponse<AthleteDetailsData>>("/api/athletes/self", {
          query: { includeVipSettings: true },
        })

        if (response?.success) {
          this.data = response.data
          this.fetchedAt = Date.now()
          return this.data
        }

        const message = response?.error ?? "Failed to fetch athlete profile."
        throw new Error(message)
      } catch (e) {
        this.error = e instanceof Error ? e : new Error(String(e))
        this.data = null
        this.fetchedAt = null
        return null
      } finally {
        this.pending = false
      }
    },
    clear() {
      this.data = null
      this.pending = false
      this.error = null
      this.fetchedAt = null
    },
  },
})


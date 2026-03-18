import { defineStore } from "pinia"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { Result } from "~/types/results"
import type { UserPublic } from "~/types/users"

export type MeetResult = Result & {
  squatPlacement: number
  benchPlacement: number
  deadliftPlacement: number
}

export type MeetDataPayload = {
  meet: MeetPublic
  results: MeetResult[]
  athletes: UserPublic[]
}

type MeetEntry = {
  data: MeetDataPayload | null
  pending: boolean
  error: Error | null
  fetchedAt: number | null
}

type MeetDataState = {
  bySlug: Record<string, MeetEntry | undefined>
}

function ensureEntry(state: MeetDataState, slug: string): MeetEntry {
  const existing = state.bySlug[slug]
  if (existing) return existing

  const created: MeetEntry = { data: null, pending: false, error: null, fetchedAt: null }
  state.bySlug[slug] = created
  return created
}

export const useMeetDataStore = defineStore("meet-data", {
  state: (): MeetDataState => ({
    bySlug: {},
  }),
  actions: {
    async fetchMeet(slug: string, options?: { force?: boolean }) {
      const entry = ensureEntry(this.$state, slug)
      if (!options?.force && entry.data) return entry.data
      if (entry.pending) return entry.data

      entry.pending = true
      entry.error = null

      try {
        const response = await $fetch<ApiResponse<MeetDataPayload>>(`/api/meets/${slug}`)

        if (response?.success) {
          entry.data = response.data
          entry.fetchedAt = Date.now()
          return entry.data
        }

        const message = response?.error ?? `Failed to fetch meet: ${slug}`
        throw new Error(message)
      } catch (e) {
        entry.error = e instanceof Error ? e : new Error(String(e))
        entry.data = null
        entry.fetchedAt = null
        return null
      } finally {
        entry.pending = false
      }
    },
    clear(slug?: string) {
      if (slug) {
        delete this.bySlug[slug]
        return
      }
      this.bySlug = {}
    },
  },
})


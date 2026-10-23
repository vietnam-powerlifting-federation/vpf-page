import { competitionHistoryRows } from "~/lib/domain/competition-history"

/** The signed-in athlete's own competitions: meets entered, whether each is completed, and whether its result is shown on their profile. */
export function useCompetitionHistory() {
  // The history is the aggregate shape, not the session record, so it comes from the
  // profile endpoint rather than from `useProfileAthlete`.
  const { data, pending } = useProfileCompetitions()

  const rows = computed(() => {
    if (!data.value?.meets?.length) return []
    return competitionHistoryRows(data.value.meets, data.value.compHistory || [], new Date().toISOString().slice(0, 10))
  })

  return reactive({ rows, pending })
}

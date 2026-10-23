import { RANKED_DIVISION, WEIGHT_CLASS_FEMALE, WEIGHT_CLASS_MALE } from "~/lib/constants/constants"
import { DIVISION_LABEL_KEY, SEX_LABEL_KEY } from "~/lib/domain/format"
import { groupRecordHistory } from "~/lib/domain/record-history"
import type { RecordRow } from "~/types/records"
import type { Division, Sex } from "~/types/union-types"

/**
 * Everything the Records page shows and changes: the URL-backed view (current board or
 * one championship's history, category, division, season), the records for it, and
 * the record whose detail drawer is open. Returned as one reactive object.
 */
export function useRecordsPage() {
  const { t } = useI18n()
  const query = useQueryState({ mode: "current", sex: "male", division: "open", year: "" })

  const mode = computed(() => (query.state.value.mode === "history" ? "history" : "current"))
  const sex = computed<Sex>(() => (query.state.value.sex === "female" ? "female" : "male"))
  const division = computed<Division>(() =>
    RANKED_DIVISION.includes(query.state.value.division) ? query.state.value.division as Division : "open")
  const year = computed(() => (query.state.value.year ? Number(query.state.value.year) : null))

  const board = useRecords(year, { key: "records-board", immediate: () => mode.value === "current" })
  const history = useRecordHistory(year, () => mode.value === "history")

  // The previous season's standing records, for "was … kg" and the improvement column.
  const previousYear = computed(() => (history.meet.value ? history.meet.value.systemYear - 1 : null))
  const previous = useRecords(previousYear, {
    key: "records-previous",
    immediate: () => mode.value === "history" && previousYear.value !== null,
  })

  // VIP name colours, fetched once in the browser and shared across pages.
  const { fetchDecorators } = useNameDecorators()
  onMounted(fetchDecorators)

  const weightClasses = computed(() => (sex.value === "female" ? WEIGHT_CLASS_FEMALE : WEIGHT_CLASS_MALE))
  const boardRows = computed(() => board.rows.value.filter((row) => row.sex === sex.value && row.division === division.value))

  const liftLabel = (lift: RecordRow["lift"]) => t(lift === "bench" ? "general.benchPress" : `general.${lift}`)
  const historyByLift = computed(() =>
    groupRecordHistory(history.rows.value, previous.rows.value, { sex: sex.value, division: division.value })
      .map((group) => ({ ...group, label: liftLabel(group.lift) })))

  const categoryLabel = computed(() => t(SEX_LABEL_KEY[sex.value]))
  const divisionLabel = computed(() => t(DIVISION_LABEL_KEY[division.value]))

  const selected = ref<RecordRow | null>(null)
  const drawerOpen = ref(false)
  function openRecord(row: RecordRow) {
    selected.value = row
    drawerOpen.value = true
  }

  const update = (patch: { mode?: string; sex?: string; division?: string; year?: string }) => query.update(patch)

  return reactive({
    mode, sex, division, year: computed(() => query.state.value.year),
    board, history, boardRows, weightClasses, historyByLift,
    categoryLabel, divisionLabel,
    selected, drawerOpen, openRecord, update,
  })
}

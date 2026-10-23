import type { ApiResponse } from "~/types/api"
import type { BilingualText, ImportPreview, ImportResult, RowAction } from "~/types/attempts"

export type AdminResultsImport = ReturnType<typeof createResultsImport>

const ADMIN_RESULTS_IMPORT_KEY: InjectionKey<AdminResultsImport> = Symbol("admin-results-import")

/** Per-row decisions carried back to the server on both preview and confirm. */
type RowOverride = { vpfId?: string; skip?: boolean }

const ACTION_SEVERITY = { create: "success", update: "info", unchanged: "secondary", delete: "danger", skip: "warn" } as const

function createResultsImport() {
  const { t, locale } = useI18n()
  const route = useRoute()
  const notify = useNotify()

  const meetId = computed(() => String(route.params.id))

  const file = ref<File | null>(null)
  const fileName = ref("")
  const preview = ref<ImportPreview | null>(null)
  const confirming = ref(false)

  /** Replaced wholesale rather than mutated so the watcher below fires reliably. */
  const overrides = ref<Record<number, RowOverride>>({})

  function setOverride(lineNumber: number, value: RowOverride | null) {
    overrides.value = Object.fromEntries(
      Object.entries(overrides.value)
        .filter(([line]) => Number(line) !== lineNumber)
        .concat(value ? [[String(lineNumber), value]] : []),
    )
  }

  const localized = (message: BilingualText) => message[locale.value as "en" | "vi"] ?? message.en
  const actionSeverity = (action: RowAction) => ACTION_SEVERITY[action]

  async function runPreview() {
    if (!file.value) return
    const body = new FormData()
    body.append("file", file.value)
    body.append("overrides", JSON.stringify(overrides.value))

    const res = await $fetch<ApiResponse<ImportPreview>>(`/api/meets/${meetId.value}/results/import`, {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body,
    })

    if (!res.success) {
      preview.value = null
      notify.apiError(res)
      return
    }
    preview.value = res.data
  }

  async function chooseFile(picked: File | null) {
    file.value = picked
    fileName.value = picked?.name ?? ""
    overrides.value = {}
    await runPreview()
  }

  function bind(lineNumber: number, vpfId: string) {
    if (!vpfId) return
    setOverride(lineNumber, { vpfId: vpfId.trim() })
  }
  const skip = (lineNumber: number) => setOverride(lineNumber, { skip: true })
  const unskip = (lineNumber: number) => setOverride(lineNumber, null)

  // Any change to the bindings re-derives the whole preview server-side, so the
  // table always reflects what would actually be written.
  watch(overrides, () => { void runPreview() })

  async function confirm() {
    if (!file.value || !preview.value) return
    confirming.value = true
    try {
      const body = new FormData()
      body.append("file", file.value)
      body.append("checksum", preview.value.checksum)
      body.append("overrides", JSON.stringify(overrides.value))

      const res = await $fetch<ApiResponse<ImportResult>>(`/api/meets/${meetId.value}/results/import/confirm`, {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body,
      })

      notify.result(res, 6000)
      if (res.success) await runPreview()
    } finally {
      confirming.value = false
    }
  }

  useHead({ title: () => t("admin.import.title") })

  return reactive({
    meetId, fileName, preview, overrides, confirming,
    localized, actionSeverity, chooseFile, bind, skip, unskip, confirm,
  })
}

/**
 * The results import's state, shared with its three steps through provide/inject: choosing the
 * file, reviewing the preview and confirming all work on one file and one set of row decisions.
 */
export function useAdminResultsImportPage() {
  const state = createResultsImport()
  provide(ADMIN_RESULTS_IMPORT_KEY, state)
  return state
}

export function useAdminResultsImport(): AdminResultsImport {
  const state = inject(ADMIN_RESULTS_IMPORT_KEY)
  if (!state) throw new Error("useAdminResultsImport() needs useAdminResultsImportPage() in a parent screen")
  return state
}

import type { ApiResponse } from "~/types/api"

/** Toasts for the outcome of an action, with the app's wording and timing. */
export function useNotify() {
  const toast = useToast()
  const { t } = useI18n()
  const apiMessage = useApiMessage()

  /** `summary` is the toast's title; the generic "An error occurred" unless a form says better. */
  function error(detail?: string, summary?: string) {
    toast.add({ severity: "error", summary: summary ?? t("general.error"), detail: detail || t("general.error"), life: 5000 })
  }

  return {
    error,
    /** A thrown error: its message when it has one. */
    failure: (e: unknown, summary?: string) => error(e instanceof Error ? e.message : undefined, summary),
    /** An API response that came back unsuccessful: its bilingual message. */
    apiError: (res: ApiResponse<unknown>, summary?: string) => error(apiMessage(res), summary),
    /** The outcome of a save or delete: a success or error toast carrying the API's message. */
    result: (res: ApiResponse<unknown>, life = 4000) => toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: apiMessage(res),
      life,
    }),
    info: (summary: string, detail: string) => toast.add({ severity: "info", summary, detail, life: 4000 }),
    success: (summary: string, detail: string) => toast.add({ severity: "success", summary, detail, life: 5000 }),
  }
}

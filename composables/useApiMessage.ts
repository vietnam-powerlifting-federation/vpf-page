import type { ApiResponse } from "~/types/api"

/**
 * Returns a helper that reads an API response's bilingual message in the active
 * locale, falling back to English. Centralises the pattern that was previously
 * duplicated inline across pages.
 *
 *   const apiMessage = useApiMessage()
 *   toast.add({ detail: apiMessage(response) })
 */
export function useApiMessage() {
  const { locale } = useI18n()
  return (response: Pick<ApiResponse<unknown>, "message">): string =>
    response.message[locale.value as "en" | "vi"] ?? response.message.en
}

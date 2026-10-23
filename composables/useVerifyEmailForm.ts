import type { ApiResponse } from "~/types/api"

type VerificationStatus = { emailVerified: boolean; identityVerified: boolean; verification: unknown }

/** Email verification: enter the emailed code, or ask for a new one. */
export function useVerifyEmailForm() {
  const { t } = useI18n()
  const notify = useNotify()
  const apiMessage = useApiMessage()
  const localePath = useLocalePath()

  const code = ref("")
  const isLoading = ref(false)
  const isResending = ref(false)

  onMounted(async () => {
    // If already verified, skip straight to the identity verification form.
    const res = await $fetch("/api/athletes/me/verification", {
      ignoreResponseError: true,
      credentials: "include",
    }) as ApiResponse<VerificationStatus>
    if (res.success && res.data.emailVerified) {
      await navigateTo(localePath("/verification"))
    }
  })

  async function verify() {
    if (!code.value.trim()) {
      notify.error(t("verifyEmail.codeRequired"))
      return
    }
    isLoading.value = true
    try {
      const res = await $fetch("/api/auth/verify-email", {
        method: "POST",
        body: { code: code.value.trim() },
        ignoreResponseError: true,
        credentials: "include",
      }) as ApiResponse<{ emailVerified: boolean }>
      if (res.success) {
        await navigateTo(localePath("/verification"))
      } else {
        notify.apiError(res)
      }
    } catch (e) {
      notify.failure(e)
    } finally {
      isLoading.value = false
    }
  }

  async function resend() {
    isResending.value = true
    try {
      const res = await $fetch("/api/auth/resend-verification", {
        method: "POST",
        ignoreResponseError: true,
        credentials: "include",
      }) as ApiResponse<null>
      if (res.success) {
        notify.info(t("verifyEmail.title"), apiMessage(res) || t("verifyEmail.resent"))
      } else {
        notify.apiError(res)
      }
    } catch (e) {
      notify.failure(e)
    } finally {
      isResending.value = false
    }
  }

  return reactive({ code, isLoading, isResending, verify, resend })
}
